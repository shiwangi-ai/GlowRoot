/**
 * A brand colour per juice, used for the "fill your box" slot rings on the
 * build-your-box page and the little composition dots in the cart drawer.
 *
 * The three signature-combo juices reuse the exact swatches from
 * `CombosSection` so the box picker and the combo hero read as one system.
 * Anything not listed falls back to a stable colour derived from its slug, so
 * new juices still get a distinct ring without a code change.
 */
const JUICE_COLORS: Record<string, string> = {
  mango: "#edba28",
  watermelon: "#dd453d",
  litchi: "#e69aa9",
  grapes: "#71347d",
  sugarcane: "#94b84b",
  carrot: "#e88a2b",
  beetroot: "#942440",
  cucumber: "#88ac48",
  tomato: "#dc4131",
  "root-reset": "#a32e53",
  "carrot-glow": "#e7922f",
  "deep-roots": "#a3253f",
  "green-roots": "#6fa03e",
  "golden-glow": "#e8b23f",
  "summer-crush": "#d4533a",
  "melon-mint-cooler": "#5fa06a",
  "litchi-rose": "#d16a8f",
  "cane-and-ginger": "#c9902f",
  "beet-boost": "#9c2a5c",
  "citrus-sunrise": "#e08a2e",
  "tropical-sunset": "#e26d4a",
  "garden-fresh": "#6f9e3a",
  "berry-blast": "#7a4a8f",
  "pomegranate-punch": "#a52347",
  "pineapple-zing": "#dfb52e",
  "pink-guava": "#dc7d87",
  "apple-ginger": "#c89442",
  "grape-escape": "#603466",
  "orange-mint": "#e58d2c",
  "ruby-citrus": "#bd3e4b",
};

// A small, on-brand palette for any juice we haven't hand-mapped above.
const FALLBACK_PALETTE = [
  "#6fa03e",
  "#d9772e",
  "#7a4a8f",
  "#d4533a",
  "#e8b23f",
  "#2f5d34",
];

/** Deterministic brand colour for a juice slug (never random, SSR-safe). */
export function juiceColor(slug: string): string {
  const mapped = JUICE_COLORS[slug];
  if (mapped) return mapped;
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length] ?? "#6fa03e";
}
