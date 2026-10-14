"use server";

import {
  cancelOrderForCustomer,
  rescheduleOrderForCustomer,
  getDeliveryPartnerById,
  getOrderForTracking,
  getOrdersByEmail,
  getPlans,
  getProducts,
} from "@glowroot/data";
import { revalidatePath } from "next/cache";
import type { Order } from "@glowroot/types";
import { getSessionUser } from "@/lib/session";

/**
 * Order reads for the account area and the public /track page.
 *
 * Identity note: `fetchMyOrders`/`fetchMyOrder` take no email — they read it off
 * the server session, so they can only ever return the caller's own orders.
 * `trackOrder` stays public on purpose: it's the route back to an order for
 * someone with no account, which is why it demands the order ID *and* the email
 * it was placed with.
 */

/** An order plus the display strings that need the product/plan catalogue. */
export type OrderView = {
  order: Order;
  /** One line per item, with the product's real name resolved. */
  lines: { name: string; qty: number; priceINR: number; detail?: string }[];
  /** Short one-liner for list rows: "Summer Crush × 3 · Golden Glow × 2". */
  summary: string;
  /**
   * Who is bringing it, once dispatch has assigned someone. The phone number
   * is only attached while the order is actually on the road — before that
   * there is nothing for the customer to call about.
   */
  partner?: { name: string; vehicle: string; phone?: string };
};

async function toView(order: Order): Promise<OrderView> {
  const [products, plans, assigned] = await Promise.all([
    getProducts(),
    getPlans(),
    order.partnerId ? getDeliveryPartnerById(order.partnerId) : undefined,
  ]);

  const partner = assigned
    ? {
        name: assigned.name,
        vehicle: assigned.vehicle,
        phone: order.status === "out-for-delivery" ? assigned.phone : undefined,
      }
    : undefined;

  if (order.type === "subscription") {
    const plan = plans.find((p) => p.slug === order.planSlug);
    const label = plan ? `${plan.name} subscription` : "Subscription";
    return { order, lines: [], summary: label, partner };
  }

  const lines = order.items.map((item) => ({
    name:
      products.find((p) => p.slug === item.productSlug)?.name ??
      item.productSlug,
    qty: item.qty,
    priceINR: item.priceINR,
    detail: item.contents?.length
      ? item.contents.map((c) => `${c.qty}× ${c.name}`).join(" · ")
      : undefined,
  }));

  return {
    order,
    lines,
    summary:
      lines.map((l) => `${l.name} × ${l.qty}`).join(" · ") ||
      "No items recorded",
    partner,
  };
}

/** The signed-in customer's own orders, newest first. Empty when logged out. */
export async function fetchMyOrders(): Promise<OrderView[]> {
  const session = await getSessionUser();
  if (!session) return [];
  const orders = await getOrdersByEmail(session.email);
  return Promise.all(orders.map(toView));
}

/**
 * One order from the signed-in customer's own history. Reuses the tracking
 * lookup, which matches on ID *and* email — so a guessed order ID belonging to
 * someone else still resolves to null.
 */
export async function fetchMyOrder(id: string): Promise<OrderView | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const order = await getOrderForTracking(id, session.email);
  return order ? toView(order) : null;
}

/**
 * Public tracking: order ID *and* the email it was placed with. Guests who
 * checked out without an account use this — it's the only way back to an order
 * when there's no session.
 */
export async function trackOrder(
  id: string,
  email: string,
): Promise<{ ok: true; view: OrderView } | { ok: false; error: string }> {
  if (!id.trim()) return { ok: false, error: "Enter your order number." };
  if (!email.trim())
    return { ok: false, error: "Enter the email you ordered with." };

  const order = await getOrderForTracking(id, email);
  if (!order) {
    return {
      ok: false,
      error:
        "We couldn't find an order with that number and email. Check both and try again.",
    };
  }
  return { ok: true, view: await toView(order) };
}

export type CancelOrderResult =
  | { ok: true; view: OrderView }
  | { ok: false; error: string; view?: OrderView };

async function cancelVerifiedOrder(
  id: string,
  email: string,
  reason: string,
): Promise<CancelOrderResult> {
  try {
    const result = await cancelOrderForCustomer(id, email, reason);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        ...(result.order ? { view: await toView(result.order) } : {}),
      };
    }
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${result.order.id}`);
    revalidatePath("/track");
    return { ok: true, view: await toView(result.order) };
  } catch {
    return {
      ok: false,
      error: "We couldn't complete the cancellation. Please try again.",
    };
  }
}

/** Account cancellations always take ownership from the server session. */
export async function cancelMyOrder(
  id: string,
  reason: string,
): Promise<CancelOrderResult> {
  const session = await getSessionUser();
  if (!session)
    return { ok: false, error: "Log in again to cancel this order." };
  return cancelVerifiedOrder(id, session.email, reason);
}

/** Guests use the same order-number + email verification as public tracking. */
export async function cancelTrackedOrder(
  id: string,
  email: string,
  reason: string,
): Promise<CancelOrderResult> {
  return cancelVerifiedOrder(id, email, reason);
}

export type RescheduleOrderResult = CancelOrderResult;

async function rescheduleVerifiedOrder(
  id: string,
  email: string,
  expectedDeliveryDate: string,
  selectedDate: string,
): Promise<RescheduleOrderResult> {
  try {
    const result = await rescheduleOrderForCustomer(
      id,
      email,
      expectedDeliveryDate,
      selectedDate,
    );
    if (!result.ok)
      return {
        ok: false,
        error: result.error,
        ...(result.order ? { view: await toView(result.order) } : {}),
      };
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${result.order.id}`);
    revalidatePath("/track");
    return { ok: true, view: await toView(result.order) };
  } catch {
    return {
      ok: false,
      error: "We couldn't reschedule the order. Please try again.",
    };
  }
}

export async function rescheduleMyOrder(
  id: string,
  expectedDeliveryDate: string,
  selectedDate: string,
): Promise<RescheduleOrderResult> {
  const session = await getSessionUser();
  if (!session)
    return { ok: false, error: "Log in again to reschedule this order." };
  return rescheduleVerifiedOrder(
    id,
    session.email,
    expectedDeliveryDate,
    selectedDate,
  );
}

export async function rescheduleTrackedOrder(
  id: string,
  email: string,
  expectedDeliveryDate: string,
  selectedDate: string,
): Promise<RescheduleOrderResult> {
  return rescheduleVerifiedOrder(id, email, expectedDeliveryDate, selectedDate);
}
