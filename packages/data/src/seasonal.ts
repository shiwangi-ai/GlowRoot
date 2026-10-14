import type { Produce, Product } from "@glowroot/types";

// Existing seasonal-only prices, shared by cards and server-side checkout.
// Named menu juices always use the live catalogue, including admin overrides.
export function resolveSeasonalProduct(
  item: Produce,
  catalogue: Product[],
): Product {
  const product = catalogue.find((p) => p.slug === item.id);
  if (product) return product;
  return {
    slug: `produce-${item.id}`,
    name: item.group === "veg-blend" ? item.name : `${item.name} Juice`,
    kind: "juice",
    priceINR: { fruit: 110, "veg-single": 120, "veg-blend": 150 }[item.group],
    volumeMl: 250,
    ingredients:
      item.group === "veg-blend" ? item.note.split(" · ") : [item.name],
    description: item.note,
    imageUrl: `/assets/seasonal-bottle-${item.id}.png`,
    tags: [item.tag],
    recipe: [],
  };
}

/** Reconcile saved seasonal placeholders and merge them with their menu juice. */
export function reconcileCart<T extends { product: Product; qty: number }>(
  items: T[],
  catalogue: Product[],
): T[] {
  const result: T[] = [];
  for (const item of items) {
    const slug = item.product.slug;
    const product =
      catalogue.find((p) => p.slug === slug.replace(/^produce-/, "")) ??
      catalogue.find((p) => p.slug === slug) ??
      item.product;
    const existing = result.find((line) => line.product.slug === product.slug);
    if (existing) existing.qty += item.qty;
    else result.push({ ...item, product });
  }
  return result;
}
