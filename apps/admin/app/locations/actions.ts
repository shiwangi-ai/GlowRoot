"use server";

import { revalidatePath } from "next/cache";
import {
  createServiceArea,
  deleteServiceArea,
  setNationwideDelivery,
  setServiceAreaActive,
  updateServiceArea,
  type ServiceAreaInput,
} from "@glowroot/data";
import { checkPermission } from "@/lib/access";
import { recordAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Every mutation on this screen changes what customers are told about their
 * pincode, so all four run through `settings.manage` and land in the audit log.
 *
 * The storefront reads the same file, but it is a separate Next.js process with
 * its own cache — `revalidatePath` here only refreshes the admin's own views.
 */
async function guard() {
  return checkPermission("settings.manage");
}

function refresh() {
  revalidatePath("/locations");
  revalidatePath("/");
}

/** Turn a thrown validation message into an inline form error. */
function failed(error: unknown): ActionResult {
  return {
    ok: false,
    error:
      error instanceof Error
        ? error.message
        : "That change could not be saved.",
  };
}

/** Create when `id` is null, edit otherwise — the drawer uses one path. */
export async function saveLocation(
  id: string | null,
  input: ServiceAreaInput,
): Promise<ActionResult> {
  const access = await guard();
  if (!access.ok) return access;

  try {
    const area = id
      ? await updateServiceArea(id, input)
      : await createServiceArea(input);
    await recordAudit({
      actorUserId: access.identity.id,
      action: id ? "locations.updated" : "locations.created",
      targetType: "service_area",
      targetId: area.id,
      after: {
        pincode: area.pincode,
        area: area.area,
        city: area.city,
        active: area.active,
      },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

/** Pause or resume an area. Paused areas stop accepting orders immediately. */
export async function toggleLocation(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const access = await guard();
  if (!access.ok) return access;

  try {
    const area = await setServiceAreaActive(id, active);
    await recordAudit({
      actorUserId: access.identity.id,
      action: active ? "locations.resumed" : "locations.paused",
      targetType: "service_area",
      targetId: id,
      after: { pincode: area.pincode, active },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function removeLocation(id: string): Promise<ActionResult> {
  const access = await guard();
  if (!access.ok) return access;

  try {
    await deleteServiceArea(id);
    await recordAudit({
      actorUserId: access.identity.id,
      action: "locations.deleted",
      targetType: "service_area",
      targetId: id,
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

/**
 * The network-wide switch: deliver anywhere a pincode is well-formed, or only
 * to the areas on this list. Paused areas stay closed either way.
 */
export async function setNationwide(on: boolean): Promise<ActionResult> {
  const access = await guard();
  if (!access.ok) return access;

  try {
    await setNationwideDelivery(on);
    await recordAudit({
      actorUserId: access.identity.id,
      action: "locations.coverage_changed",
      targetType: "service_settings",
      after: { nationwide: on },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}
