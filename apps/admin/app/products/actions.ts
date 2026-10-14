"use server";

import { saveCatalogueProduct } from "@glowroot/data";
import type { Product } from "@glowroot/types";
import { revalidatePath } from "next/cache";
import { access } from "fs/promises";
import path from "path";
import {
  isUploadedProductImage,
  readProductImage,
} from "@glowroot/data/product-images";
import { checkPermission } from "@/lib/access";
import { recordAudit } from "@/lib/audit";

export async function saveProduct(
  originalSlug: string | null,
  input: Product,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const allowed = await checkPermission(
    originalSlug ? "catalogue.edit" : "catalogue.create",
  );
  if (!allowed.ok) return allowed;
  // This first editor saves directly to the live menu, so publishing is required.
  if (!allowed.identity.permissions.has("catalogue.publish"))
    return {
      ok: false,
      error:
        "Publishing permission is required to save changes to the live menu.",
    };
  try {
    if (typeof input.imageUrl !== "string")
      throw new Error("Choose a product image.");
    if (isUploadedProductImage(input.imageUrl)) {
      await readProductImage(input.imageUrl.split("/").pop()!);
    } else {
      if (!/^\/assets\/[a-zA-Z0-9_-]+\.(png|webp|jpe?g)$/i.test(input.imageUrl))
        throw new Error("Choose a product image.");
      await access(path.join(process.cwd(), "public", input.imageUrl));
      await access(
        path.join(process.cwd(), "..", "storefront", "public", input.imageUrl),
      );
    }
    const product = await saveCatalogueProduct(
      originalSlug,
      input,
      allowed.identity.permissions.has("catalogue.change_price"),
    );
    await recordAudit({
      actorUserId: allowed.identity.id,
      action: originalSlug ? "catalogue.updated" : "catalogue.created",
      targetType: "product",
      targetId: product.slug,
      after: {
        name: product.name,
        priceINR: product.priceINR,
        recipe: product.recipe,
      },
    });
    revalidatePath("/products");
    return { ok: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return {
        ok: false,
        error: "This image is no longer available. Please upload it again.",
      };
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not save this product.",
    };
  }
}
