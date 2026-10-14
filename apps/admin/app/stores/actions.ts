"use server";

import { saveShop, type ShopInput } from "@glowroot/data";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/access";
import { recordAudit } from "@/lib/audit";

export async function saveStore(
  id: string | null,
  input: ShopInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await checkPermission("settings.manage");
  if (!access.ok) return access;
  try {
    const shop = await saveShop(id, input);
    await recordAudit({
      actorUserId: access.identity.id,
      action: id ? "stores.updated" : "stores.created",
      targetType: "store",
      targetId: shop.id,
      after: { name: shop.name, areaIds: shop.areaIds },
    });
    revalidatePath("/stores");
    revalidatePath("/locations");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not save the store. Try again.",
    };
  }
}
