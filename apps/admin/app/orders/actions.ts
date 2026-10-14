"use server";

import { revalidatePath } from "next/cache";
import {
  assignOrderPartner,
  getDeliveryPartnerById,
  updateOrderStatus,
} from "@glowroot/data";
import type { OrderStatus } from "@glowroot/types";
import { checkPermission } from "@/lib/access";
import { recordAudit } from "@/lib/audit";

export type ChangeStatusResult = { ok: true } | { ok: false; error: string };

/** Change an order's status from the admin detail view. */
export async function changeStatus(
  id: string,
  status: OrderStatus,
): Promise<ChangeStatusResult> {
  const access = await checkPermission("orders.update_status");
  if (!access.ok) return access;

  const validStatuses: OrderStatus[] = [
    "pending",
    "confirmed",
    "pressing",
    "out-for-delivery",
    "delivered",
    "cancelled",
  ];
  if (!id.trim() || !validStatuses.includes(status)) {
    return { ok: false, error: "Invalid order status request." };
  }

  // Cancelling is a separate capability from advancing an order.
  if (
    status === "cancelled" &&
    !access.identity.permissions.has("orders.cancel")
  ) {
    return { ok: false, error: "You do not have permission to cancel orders." };
  }

  try {
    const updated = await updateOrderStatus(id, status);
    if (!updated) return { ok: false, error: "Order not found." };

    await recordAudit({
      actorUserId: access.identity.id,
      action: "orders.status_changed",
      targetType: "order",
      targetId: id,
      after: { status },
    });

    revalidatePath(`/orders/${id}`);
    revalidatePath("/orders");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "That status change is not allowed from the current state.",
    };
  }
}

export type AssignResult = { ok: true } | { ok: false; error: string };

/**
 * Hand an order to a delivery partner, or take it back with `null`.
 *
 * Dispatch is its own permission: a fulfilment agent who can advance an order's
 * status is not necessarily the person who decides who carries it.
 */
export async function assignPartner(
  orderId: string,
  partnerId: string | null,
): Promise<AssignResult> {
  const access = await checkPermission("fulfilment.manage");
  if (!access.ok) return access;
  if (!orderId.trim()) return { ok: false, error: "Invalid order." };

  try {
    const updated = await assignOrderPartner(orderId, partnerId);
    if (!updated) return { ok: false, error: "Order not found." };

    const partner = partnerId ? await getDeliveryPartnerById(partnerId) : null;
    await recordAudit({
      actorUserId: access.identity.id,
      action: partnerId ? "orders.partner_assigned" : "orders.partner_cleared",
      targetType: "order",
      targetId: orderId,
      after: { partnerId, partnerName: partner?.name ?? null },
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    revalidatePath("/delivery");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "That assignment could not be saved.",
    };
  }
}
