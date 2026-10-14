"use server";

import { revalidatePath } from "next/cache";
import {
  createPartner,
  deletePartner,
  getOrders,
  setPartnerStatus,
  updatePartner,
  type DeliveryPartnerInput,
} from "@glowroot/data";
import type { DeliveryPartnerStatus } from "@glowroot/types";
import { checkPermission } from "@/lib/access";
import { recordAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/delivery");
  revalidatePath("/orders");
  revalidatePath("/");
}

function failed(error: unknown): ActionResult {
  return {
    ok: false,
    error:
      error instanceof Error
        ? error.message
        : "That change could not be saved.",
  };
}

/** Orders a partner is still carrying — what blocks removing them. */
async function liveOrdersFor(partnerId: string): Promise<number> {
  const orders = await getOrders();
  return orders.filter(
    (o) =>
      o.partnerId === partnerId &&
      o.status !== "delivered" &&
      o.status !== "cancelled",
  ).length;
}

/** Create when `id` is null, edit otherwise — the drawer uses one path. */
export async function savePartner(
  id: string | null,
  input: DeliveryPartnerInput,
): Promise<ActionResult> {
  const access = await checkPermission("fulfilment.manage");
  if (!access.ok) return access;

  try {
    const partner = id
      ? await updatePartner(id, input)
      : await createPartner(input);
    await recordAudit({
      actorUserId: access.identity.id,
      action: id ? "delivery.partner_updated" : "delivery.partner_added",
      targetType: "delivery_partner",
      targetId: partner.id,
      after: {
        name: partner.name,
        zones: partner.zones,
        status: partner.status,
      },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

/** Move a partner between available / on-route / off-duty / inactive. */
export async function changePartnerStatus(
  id: string,
  status: DeliveryPartnerStatus,
): Promise<ActionResult> {
  const access = await checkPermission("fulfilment.manage");
  if (!access.ok) return access;

  try {
    // Standing someone down while they are mid-route would hide live drops
    // from the board, so make the operator reassign first.
    if (status === "inactive") {
      const live = await liveOrdersFor(id);
      if (live > 0) {
        return {
          ok: false,
          error: `Reassign their ${live} live order${live === 1 ? "" : "s"} before deactivating.`,
        };
      }
    }
    const partner = await setPartnerStatus(id, status);
    await recordAudit({
      actorUserId: access.identity.id,
      action: "delivery.partner_status_changed",
      targetType: "delivery_partner",
      targetId: id,
      after: { name: partner.name, status },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function removePartner(id: string): Promise<ActionResult> {
  const access = await checkPermission("fulfilment.manage");
  if (!access.ok) return access;

  try {
    const live = await liveOrdersFor(id);
    if (live > 0) {
      return {
        ok: false,
        error: `They are carrying ${live} live order${live === 1 ? "" : "s"} — reassign those first.`,
      };
    }
    await deletePartner(id);
    await recordAudit({
      actorUserId: access.identity.id,
      action: "delivery.partner_removed",
      targetType: "delivery_partner",
      targetId: id,
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}
