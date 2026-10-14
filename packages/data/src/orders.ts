import type { Order } from "@glowroot/types";

/**
 * Seed orders for the admin app. In this mock phase orders live in memory
 * (see the accessors in `index.ts`). When a real backend lands in Phase 4,
 * only this module's storage changes — the accessor signatures stay put.
 */
export const seedOrders: Order[] = [
  {
    id: "GR-1042",
    customer: {
      name: "Ananya Rao",
      email: "ananya.rao@example.com",
      phone: "+91 98200 11223",
      address: "12 Juhu Lane, Mumbai 400049",
    },
    items: [
      { productSlug: "summer-crush", qty: 3, priceINR: 180 },
      { productSlug: "golden-glow", qty: 2, priceINR: 170 },
    ],
    type: "one-time",
    status: "pressing",
    totalINR: 880,
    createdAt: "2026-07-15T06:20:00+05:30",
    deliveryDate: "2026-07-16T07:00:00+05:30",
    deliveryPincode: "400049",
  },
  {
    id: "GR-1041",
    customer: {
      name: "Vikram Shah",
      email: "vikram.shah@example.com",
      address: "Flat 7B, Koramangala, Bengaluru 560095",
    },
    items: [{ productSlug: "green-roots", qty: 7, priceINR: 190 }],
    type: "subscription",
    planSlug: "daily-glow",
    status: "out-for-delivery",
    totalINR: 799,
    createdAt: "2026-07-15T05:50:00+05:30",
    deliveryDate: "2026-07-15T07:30:00+05:30",
    deliveryPincode: "560095",
    partnerId: "DP-1003",
  },
  {
    id: "GR-1040",
    customer: {
      name: "Meera Nair",
      email: "meera.nair@example.com",
      phone: "+91 90040 55667",
      address: "22 Residency Road, Kochi 682011",
    },
    items: [
      { productSlug: "deep-roots", qty: 1, priceINR: 190 },
      { productSlug: "green-roots", qty: 1, priceINR: 190 },
      { productSlug: "golden-glow", qty: 1, priceINR: 170 },
    ],
    type: "one-time",
    status: "confirmed",
    totalINR: 450,
    createdAt: "2026-07-15T08:10:00+05:30",
    deliveryDate: "2026-07-16T07:00:00+05:30",
    deliveryPincode: "682011",
  },
  {
    id: "GR-1039",
    customer: {
      name: "Rohan Gupta",
      email: "rohan.gupta@example.com",
      address: "5 Civil Lines, Jaipur 302006",
    },
    items: [{ productSlug: "berry-roots-smoothie", qty: 4, priceINR: 220 }],
    type: "one-time",
    status: "delivered",
    totalINR: 880,
    createdAt: "2026-07-14T09:00:00+05:30",
    deliveryDate: "2026-07-15T07:00:00+05:30",
    deliveryPincode: "302006",
  },
  {
    id: "GR-1038",
    customer: {
      name: "Priya Menon",
      email: "priya.menon@example.com",
      phone: "+91 99870 33445",
      address: "88 Banjara Hills, Hyderabad 500034",
    },
    items: [{ productSlug: "cane-and-ginger", qty: 14, priceINR: 150 }],
    type: "subscription",
    planSlug: "family-reset",
    status: "pending",
    totalINR: 1499,
    createdAt: "2026-07-15T10:05:00+05:30",
    deliveryDate: "2026-07-17T07:00:00+05:30",
    deliveryPincode: "500034",
  },
  {
    id: "GR-1037",
    customer: {
      name: "Kabir Singh",
      email: "kabir.singh@example.com",
      address: "3 Marine Drive, Mumbai 400020",
    },
    items: [
      { productSlug: "melon-mint-cooler", qty: 2, priceINR: 160 },
      { productSlug: "litchi-rose", qty: 1, priceINR: 200 },
    ],
    type: "one-time",
    status: "cancelled",
    totalINR: 520,
    createdAt: "2026-07-14T14:30:00+05:30",
    deliveryDate: "2026-07-15T07:00:00+05:30",
    deliveryPincode: "400020",
  },
];
