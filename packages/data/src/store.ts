/** Shared PostgreSQL order store. Each mutation locks only its target order. */
import { db } from "@glowroot/db";
import type { Order } from "@glowroot/types";
import { upsertProfileRow } from "./users";
import { orderFromRow, orderToRow } from "./order-record";
import { rescheduledDeliveryDate, deliveryToday } from "./order-schedule";

const allowedTransitions: Record<Order["status"], Order["status"][]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["pressing", "cancelled"],
  pressing: ["out-for-delivery", "cancelled"],
  "out-for-delivery": ["delivered"],
  delivered: [],
  cancelled: [],
};

export async function readOrders(): Promise<Order[]> {
  return (
    await db.customerOrder.findMany({ orderBy: { createdAt: "desc" } })
  ).map(orderFromRow);
}

/** Ownership and state checks run under the same row lock as the write. */
async function withStoredOrder<T>(
  id: string,
  email: string | undefined,
  change: (order: Order | undefined) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM customer_orders WHERE id = ${id}::public.citext FOR UPDATE`;
    const row = await tx.customerOrder.findUnique({ where: { id } });
    if (
      !row ||
      (email !== undefined && row.customerEmail.toLowerCase() !== email)
    )
      return change(undefined);
    const order = orderFromRow(row);
    const before = JSON.stringify(order);
    const result = await change(order);
    if (JSON.stringify(order) !== before) {
      await tx.customerOrder.update({
        where: { id: row.id },
        data: orderToRow(order),
      });
    }
    return result;
  });
}

/** Customer profile + order either both commit or neither does. */
export async function appendOrder(order: Order): Promise<Order> {
  return db.$transaction(async (tx) => {
    const customer = await upsertProfileRow(tx, {
      ...order.customer,
      pincode: order.deliveryPincode,
      nowISO: order.createdAt,
    });
    const row = await tx.customerOrder.create({
      data: { ...orderToRow(order), customerId: customer.id },
    });
    return orderFromRow(row);
  });
}

export async function setOrderStatus(
  id: string,
  status: Order["status"],
): Promise<Order | undefined> {
  return withStoredOrder(id, undefined, async (order) => {
    if (!order) return undefined;
    if (order.status === status) return order;
    if (!allowedTransitions[order.status].includes(status)) {
      throw new Error(
        `Invalid status transition: ${order.status} -> ${status}`,
      );
    }
    order.status = status;
    // Append to the trail the customer-facing tracking timeline reads. Seed
    // orders have no history, so start one from the status they're moving to.
    order.history = [
      ...(order.history ?? []),
      { status, at: new Date().toISOString() },
    ];
    return order;
  });
}

export type CustomerCancellationResult =
  { ok: true; order: Order } | { ok: false; error: string; order?: Order };

/** Ownership, preparation cutoff and date comparison are atomic across both apps. */
export async function rescheduleOrderForCustomer(
  id: string,
  email: string,
  expectedDeliveryDate: string,
  selectedDate: string,
): Promise<CustomerCancellationResult> {
  if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof expectedDeliveryDate !== "string" ||
    typeof selectedDate !== "string" ||
    !rescheduledDeliveryDate(expectedDeliveryDate, selectedDate)
  )
    return { ok: false, error: "Enter valid order details and delivery date." };

  return withStoredOrder(
    id.trim(),
    email.trim().toLowerCase(),
    async (order) => {
      if (!order)
        return {
          ok: false,
          error:
            "We couldn't verify this order. Check your order number and email.",
        };
      if (order.status !== "pending" && order.status !== "confirmed") {
        return {
          ok: false,
          error:
            "This order can no longer be rescheduled online. Contact support for help.",
          order,
        };
      }
      const next = rescheduledDeliveryDate(expectedDeliveryDate, selectedDate)!;
      if (order.deliveryDate !== expectedDeliveryDate) {
        if (
          order.deliveryDate === next &&
          order.history?.some(
            (event) =>
              event.deliveryChange?.from === expectedDeliveryDate &&
              event.deliveryChange.to === next,
          )
        )
          return { ok: true, order };
        return {
          ok: false,
          error:
            "The delivery date has changed. Review the updated order and try again.",
          order,
        };
      }
      if (selectedDate <= deliveryToday()) {
        return { ok: false, error: "Choose a future delivery date.", order };
      }
      order.deliveryDate = next;
      delete order.partnerId;
      order.history = [
        ...(order.history ?? []),
        {
          status: order.status,
          at: new Date().toISOString(),
          note: "Delivery rescheduled by customer",
          deliveryChange: { from: expectedDeliveryDate, to: next },
        },
      ];
      return { ok: true, order };
    },
  );
}

/** Ownership and the customer's stricter cutoff are checked under the lock. */
export async function cancelOrderForCustomer(
  id: string,
  email: string,
  reason = "",
): Promise<CustomerCancellationResult> {
  if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof reason !== "string" ||
    reason.length > 500
  )
    return {
      ok: false,
      error: "Enter valid order details and a reason of up to 500 characters.",
    };

  return withStoredOrder(
    id.trim(),
    email.trim().toLowerCase(),
    async (order) => {
      if (!order)
        return {
          ok: false,
          error:
            "We couldn't verify this order. Check your order number and email.",
        };
      // Retrying a completed request must not duplicate history or payments.
      if (order.status === "cancelled") return { ok: true, order };
      if (order.status !== "pending" && order.status !== "confirmed") {
        return {
          ok: false,
          error:
            "This order can no longer be cancelled online. Contact support for help.",
          order,
        };
      }
      const note = reason.trim().replace(/\s+/g, " ");
      order.status = "cancelled";
      delete order.partnerId;
      order.history = [
        ...(order.history ?? []),
        {
          status: "cancelled",
          at: new Date().toISOString(),
          note: `Cancelled by customer${note ? `: ${note}` : ""}`,
        },
      ];
      return { ok: true, order };
    },
  );
}

/**
 * Hand an order to a delivery partner, or take it back with `null`.
 *
 * Dispatch is deliberately separate from the status ladder: an order can be
 * assigned while it is still pressing, and reassigned if a partner drops out.
 */
export async function setOrderPartner(
  id: string,
  partnerId: string | null,
): Promise<Order | undefined> {
  return withStoredOrder(id, undefined, async (order) => {
    if (!order) return undefined;
    if (
      partnerId &&
      (order.status === "cancelled" || order.status === "delivered")
    )
      throw new Error("A completed or cancelled order cannot be assigned.");
    if (partnerId) order.partnerId = partnerId;
    else delete order.partnerId;
    return order;
  });
}
