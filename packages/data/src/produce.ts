import type { Produce } from "@glowroot/types";

/**
 * The "Now in season" showcase: fruits, single-vegetable juices and
 * vegetable-forward blends. `ring.from`/`ring.to` are the radial-gradient
 * stops rendered behind each produce photo in the prototype.
 */
export const produce: Produce[] = [
  // ---- Fruits ----
  // ---- Single-Fruits juices ----
  {
    id: "mango",
    name: "Mango",
    note: "Alphonso, pressed at peak ripeness",
    tag: "Peak season",
    group: "fruit",
    imageUrl: "/assets/produce-fruit-mango.webp",
    ring: { from: "#fde9bf", to: "#f6cf7a" },
  },
  {
    id: "watermelon",
    name: "Watermelon",
    note: "Cooling, hydrating, lightly sweet",
    tag: "Hydrating",
    group: "fruit",
    imageUrl: "/assets/produce-fruit-watermelon.webp",
    ring: { from: "#f5a3a0", to: "#e0533a" },
  },
  {
    id: "litchi",
    name: "Litchi",
    note: "Floral, delicate — a summer treat",
    tag: "Limited",
    group: "fruit",
    imageUrl: "/assets/produce-fruit-litchi.webp",
    ring: { from: "#fcdada", to: "#e79aa0" },
  },
  {
    id: "grapes",
    name: "Grapes",
    note: "Sun-ripened, deep and juicy",
    tag: "Antioxidant",
    group: "fruit",
    imageUrl: "/assets/produce-fruit-grapes.webp",
    ring: { from: "#e6d3ee", to: "#bda0d2" },
  },
  {
    id: "sugarcane",
    name: "Sugarcane",
    note: "Freshly crushed, naturally energizing",
    tag: "Energy",
    group: "fruit",
    imageUrl: "/assets/produce-fruit-sugarcane.webp",
    ring: { from: "#dcebbf", to: "#a7cf76" },
  },

  // ---- Single-vegetable juices ----
  {
    id: "carrot",
    name: "Carrot",
    note: "Sweet, sunny, beta-carotene rich",
    tag: "Vitamin A",
    group: "veg-single",
    imageUrl: "/assets/produce-veg-carrot.webp",
    ring: { from: "#f6c98a", to: "#e08a2e" },
  },
  {
    id: "beetroot",
    name: "Beetroot",
    note: "Earthy, deep and detoxifying",
    tag: "Detox",
    group: "veg-single",
    imageUrl: "/assets/produce-veg-beetroot.webp",
    ring: { from: "#d98fb0", to: "#9c2d5c" },
  },
  {
    id: "cucumber",
    name: "Cucumber",
    note: "Light, cooling and hydrating",
    tag: "Hydrating",
    group: "veg-single",
    imageUrl: "/assets/produce-veg-cucumber.webp",
    ring: { from: "#d8ebb2", to: "#8fb95a" },
  },
  {
    id: "tomato",
    name: "Tomato",
    note: "Savory, tangy, lycopene-rich",
    tag: "Savory",
    group: "veg-single",
    imageUrl: "/assets/produce-veg-tomato.webp",
    ring: { from: "#f4a89a", to: "#d4402c" },
  },

  // ---- Vegetable-forward blends ----
  {
    id: "green-roots",
    name: "Green Roots",
    note: "Kale · cucumber · green apple",
    tag: "Bestseller",
    group: "veg-blend",
    imageUrl: "/assets/produce-blend-green.webp",
    ring: { from: "#cfe6a8", to: "#6fa03e" },
  },
  {
    id: "root-reset",
    name: "Root Reset",
    note: "Beetroot · apple · carrot · mint",
    tag: "Cleanse",
    group: "veg-blend",
    imageUrl: "/assets/produce-blend-root.webp",
    ring: { from: "#e6b3c6", to: "#b23e6b" },
  },
  {
    id: "carrot-glow",
    name: "Carrot Glow",
    note: "Carrot · orange · ginger",
    tag: "Immunity",
    group: "veg-blend",
    imageUrl: "/assets/produce-blend-carrot.webp",
    ring: { from: "#f7d39a", to: "#e08a2e" },
  },
  {
    id: "beet-boost",
    name: "Beet Boost",
    note: "Beetroot · berry · lemon",
    tag: "Pre-workout",
    group: "veg-blend",
    imageUrl: "/assets/produce-blend-beet.webp",
    ring: { from: "#d99bb4", to: "#9c2d5c" },
  },
];
