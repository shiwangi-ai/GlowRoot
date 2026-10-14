import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import type { Shop } from "@glowroot/types";
import { dataFile } from "./repo-root";
import { readServiceAreas } from "./zones";

export type ShopInput = Pick<
  Shop,
  "name" | "address" | "city" | "pincode" | "phone" | "areaIds"
>;
const file = () => dataFile(".glowroot-shops.json");

export async function getShops(): Promise<Shop[]> {
  try {
    const shops: unknown = JSON.parse(await fs.readFile(file(), "utf8"));
    if (!Array.isArray(shops)) throw new Error("Invalid store data.");
    return shops as Shop[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

// This file is written by the admin process only. Serialize its mutations and
// replace atomically so readers never see a partially written document.
let writes: Promise<unknown> = Promise.resolve();
export function saveShop(id: string | null, input: ShopInput): Promise<Shop> {
  const operation = writes.then(async () => {
    const [shops, areas] = await Promise.all([getShops(), readServiceAreas()]);
    const existing = id ? shops.find((shop) => shop.id === id) : undefined;
    if (id && !existing)
      throw new Error("That store no longer exists. Refresh and try again.");
    const clean = (value: string, max: number) => {
      if (typeof value !== "string") throw new Error("Invalid store details.");
      return value.trim().replace(/\s+/g, " ").slice(0, max);
    };
    const name = clean(input.name, 100);
    const address = clean(input.address, 300);
    const city = clean(input.city, 80);
    const pincode = clean(input.pincode, 6);
    const phone = clean(input.phone, 24);
    if (!name || !address || !city)
      throw new Error("Enter a store name, street address and city.");
    if (!/^[1-9]\d{5}$/.test(input.pincode.trim()))
      throw new Error("Enter a valid 6-digit store pincode.");
    if (phone && !/^\+?[\d\s()-]{7,24}$/.test(phone))
      throw new Error("Enter a valid contact phone number.");
    if (
      !Array.isArray(input.areaIds) ||
      input.areaIds.some((value) => typeof value !== "string")
    )
      throw new Error("Select valid locations.");
    if (input.areaIds.length !== 1)
      throw new Error("Select exactly one location for this store.");
    const areaIds = [...input.areaIds];
    for (const areaId of areaIds) {
      const area = areas.find((item) => item.id === areaId);
      if (!area)
        throw new Error(
          "A selected location was removed. Refresh and try again.",
        );
    }
    const shop: Shop = {
      id: existing?.id ?? randomUUID(),
      name,
      address,
      city,
      pincode,
      phone,
      areaIds,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    const next = existing
      ? shops.map((item) => (item.id === id ? shop : item))
      : [...shops, shop];
    const temporary = `${file()}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(next, null, 2), "utf8");
      await fs.rename(temporary, file());
    } finally {
      await fs.unlink(temporary).catch(() => undefined);
    }
    return shop;
  });
  writes = operation.catch(() => undefined);
  return operation;
}
