/** Formatting + string helpers shared across both apps. */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** 180 -> "₹180". Matches the ₹ pricing used throughout the prototype. */
export function formatINR(amount: number): string {
  return inr.format(amount);
}

/**
 * The standard cold-pressed bottle we sell in. Every juice ships at this size,
 * so boxes and subscription plans price per 100 ml bottle. Products carry their
 * own `volumeMl` (the smoothie jar is 250, a shot is 60) — use that when you
 * have a product in hand, and this only for boxes/plans, which are juice-only.
 */
export const BOTTLE_ML = 100;

/** "Summer Crush" -> "summer-crush" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Join ingredient names the way the prototype does: "A · B · C". */
export function joinIngredients(ingredients: string[]): string {
  return ingredients.join(" · ");
}

/** Title-case a hyphenated status/slug: "out-for-delivery" -> "Out for delivery". */
export function humanize(value: string): string {
  const spaced = value.replace(/[-_]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Format an ISO date string as e.g. "15 Jul 2026". */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
