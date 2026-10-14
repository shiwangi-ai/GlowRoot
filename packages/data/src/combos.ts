import type { Bundle, Combo } from "@glowroot/types";

/** The signature trio combo hero. */
export const combos: Combo[] = [
  {
    slug: "natures-palette",
    name: "Nature's Palette Combo",
    itemSlugs: ["deep-roots", "green-roots", "golden-glow"],
    priceINR: 450,
    wasPriceINR: 530,
    quantity: 3,
  },
];

/** The one-time bundle-picker cards below the combo hero. */
export const bundles: Bundle[] = [
  {
    slug: "sampler-box",
    name: "Sampler Box",
    quantity: 3,
    qtyLabel: "3 bottles · one-time",
    description:
      "A one-off trio to try — a single day of colour across fruit and veg.",
    priceINR: 450,
    perBottleINR: 150,
    ctaVariant: "primary",
    ctaLabel: "Build Sampler Box",
  },
  {
    slug: "sharing-box",
    name: "Sharing Box",
    quantity: 6,
    qtyLabel: "6 bottles · one-time",
    description:
      "Enough for two — or a small get-together. Mix any six pressings you like.",
    priceINR: 840,
    perBottleINR: 140,
    featured: true,
    pickLabel: "Best for sharing",
    ctaVariant: "primary",
    ctaLabel: "Build Sharing Box",
  },
];
