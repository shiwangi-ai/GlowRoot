import type { Plan } from "@glowroot/types";

/**
 * Subscription plans behind the weekly/monthly billing toggle. Per-cycle
 * pricing / bottle counts are exactly the `data-weekly` / `data-monthly`
 * values from the prototype's toggle.
 */
export const plans: Plan[] = [
  {
    slug: "fresh-starter",
    name: "Fresh Starter",
    blurb: "A light intro — 3 cold-pressed bottles each delivery.",
    bottlesPerDelivery: 3,
    pricing: {
      weekly: { priceINR: 399, bottles: 3, perBottleINR: 133 },
      monthly: { priceINR: 1399, bottles: 12, perBottleINR: 117 },
    },
    perks: [
      "3 seasonal juices per delivery",
      "Free doorstep delivery",
      "Skip or pause anytime",
    ],
  },
  {
    slug: "daily-glow",
    name: "Daily Glow",
    blurb: "A bottle a day — the trio plus extras, our best-loved plan.",
    bottlesPerDelivery: 7,
    pricing: {
      weekly: { priceINR: 799, bottles: 7, perBottleINR: 114 },
      monthly: { priceINR: 2799, bottles: 28, perBottleINR: 100 },
    },
    perks: [
      "7 juices — one for every day",
      "Priority morning delivery",
      "Mix & match any blends",
      "Swap to seasonal specials first",
    ],
    featured: true,
  },
  {
    slug: "family-reset",
    name: "Family Reset",
    blurb: "Enough for the whole house — 14 bottles each delivery.",
    bottlesPerDelivery: 14,
    pricing: {
      weekly: { priceINR: 1499, bottles: 14, perBottleINR: 107 },
      monthly: { priceINR: 5299, bottles: 56, perBottleINR: 95 },
    },
    perks: [
      "14 juices across fruit & veg",
      "Free delivery, flexible days",
      "Best price per bottle",
    ],
  },
];
