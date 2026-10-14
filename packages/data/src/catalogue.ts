import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import type { Product } from "@glowroot/types";
import { products } from "./products";
import { materials } from "./materials";
import { dataFile } from "./repo-root";

const file = () => dataFile(".glowroot-catalogue.json");
export async function readCatalogue(): Promise<Product[]> {
  try {
    const saved: unknown = JSON.parse(await fs.readFile(file(), "utf8"));
    if (!Array.isArray(saved)) throw new Error("Invalid saved catalogue.");
    // Save overrides only, so new seed products and images remain available.
    const overrides = new Map((saved as Product[]).map((p) => [p.slug, p]));
    return [
      ...products.map((p) => overrides.get(p.slug) ?? p),
      ...(saved as Product[]).filter(
        (p) => !products.some((seed) => seed.slug === p.slug),
      ),
    ];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return products;
    throw error;
  }
}

export function validateProduct(input: Product): Product {
  const text = (value: unknown, label: string, limit: number) => {
    if (typeof value !== "string" || !value.trim() || value.length > limit)
      throw new Error(`Enter ${label} (up to ${limit} characters).`);
    return value.trim();
  };
  const slug = text(input.slug, "a product URL name", 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error(
      "Product URL must use lowercase letters, numbers and hyphens.",
    );
  const name = text(input.name, "a product name", 100);
  const description = text(input.description, "a description", 1000);
  if (!["juice", "smoothie", "shot"].includes(input.kind))
    throw new Error("Select a product category.");
  if (
    !Number.isFinite(input.priceINR) ||
    input.priceINR <= 0 ||
    input.priceINR > 100000 ||
    Math.abs(input.priceINR * 100 - Math.round(input.priceINR * 100)) > 0.00001
  )
    throw new Error("Enter a positive price with at most two decimal places.");
  if (
    !Number.isInteger(input.volumeMl) ||
    input.volumeMl < 1 ||
    input.volumeMl > 10000
  )
    throw new Error("Volume must be between 1 and 10,000 ml.");
  if (!["summer", "winter", "all"].includes(input.season ?? "all"))
    throw new Error("Select a valid season.");
  const imageUrl = text(input.imageUrl, "an image path", 250);
  if (
    !/^\/assets\/[a-zA-Z0-9_-]+\.(png|webp|jpe?g)$/i.test(imageUrl) &&
    !/^\/media\/products\/[a-f0-9-]{36}\.webp$/.test(imageUrl)
  )
    throw new Error("Choose a product image.");
  if (
    !Array.isArray(input.ingredients) ||
    !input.ingredients.length ||
    input.ingredients.length > 30
  )
    throw new Error("Enter at least one ingredient (maximum 30).");
  const ingredients = input.ingredients.map((value) =>
    text(value, "an ingredient name", 80),
  );
  if (!Array.isArray(input.tags) || input.tags.length > 10)
    throw new Error("Use up to 10 tags.");
  const tags = [
    ...new Set(input.tags.map((value) => text(value, "a tag", 40))),
  ];
  if (
    !Array.isArray(input.recipe) ||
    !input.recipe.length ||
    input.recipe.length > 30
  )
    throw new Error("Add at least one recipe ingredient (maximum 30).");
  const seen = new Set<string>();
  const recipe = input.recipe.map((row) => {
    if (!materials.some((m) => m.id === row.materialId))
      throw new Error("Select an existing material for each recipe row.");
    if (seen.has(row.materialId))
      throw new Error("Use each material only once in the recipe.");
    seen.add(row.materialId);
    if (!Number.isFinite(row.grams) || row.grams <= 0 || row.grams > 100000)
      throw new Error(
        "Recipe quantities must be positive grams (up to 100,000).",
      );
    return { materialId: row.materialId, grams: row.grams };
  });
  return {
    slug,
    name,
    description,
    kind: input.kind,
    priceINR: input.priceINR,
    volumeMl: input.volumeMl,
    imageUrl,
    ingredients,
    tags,
    season: input.season ?? "all",
    recipe,
  };
}

let writes: Promise<unknown> = Promise.resolve();
export function saveCatalogueProduct(
  originalSlug: string | null,
  input: Product,
  canChangePrice: boolean,
): Promise<Product> {
  const operation = writes.then(async () => {
    const product = validateProduct(input);
    const catalogue = await readCatalogue();
    const existing = originalSlug
      ? catalogue.find((p) => p.slug === originalSlug)
      : undefined;
    if (originalSlug && !existing)
      throw new Error("Product no longer exists. Refresh and try again.");
    if (existing && existing.slug !== product.slug)
      throw new Error("An existing product URL cannot be changed.");
    if (!existing && catalogue.some((p) => p.slug === product.slug))
      throw new Error("That product URL is already in use.");
    if (existing && existing.priceINR !== product.priceINR && !canChangePrice)
      throw new Error("You do not have permission to change prices.");
    const next = [...catalogue.filter((p) => p.slug !== product.slug), product];
    const overrides = next.filter(
      (p) =>
        JSON.stringify(p) !==
        JSON.stringify(products.find((seed) => seed.slug === p.slug)),
    );
    const temporary = `${file()}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(overrides, null, 2), "utf8");
      await fs.rename(temporary, file());
    } finally {
      await fs.unlink(temporary).catch(() => undefined);
    }
    return product;
  });
  writes = operation.catch(() => undefined);
  return operation;
}
