# GlowRoot — Frontend Planning & Monorepo Architecture

> A learning project built as a **real** application: a cold-pressed juice brand with a
> customer-facing storefront and an internal admin panel for tracking orders and materials.
>
> This document is the **plan**, not the code yet. It captures the decisions, the target
> architecture, the data model we already have, and a phased roadmap so you can build it
> step by step.

---

## 1. Where we are today

The current project is a single, hand-crafted marketing page:

```
GlowRoot-final/
├── GlowRoot.html        # ~1160 lines: markup + inline CSS + vanilla JS
├── image-slot.js        # <image-slot> web component (a DESIGN-TOOL scaffold, not app code)
├── assets/              # logos + product/produce images (png, webp)
├── screenshots/         # design references
└── uploads/             # AI-generated image drops
```

**What's good and worth keeping**

- A polished, coherent visual design with a proper **design-token system** (`--leaf`, `--carrot`, `--cream`, type scale, etc.). These tokens become our Tailwind theme.
- A complete **content/domain model** already expressed in the markup: products, seasonal produce, combos, subscription plans. This is effectively a first draft of the database schema.
- Working interactions (juice carousel, weekly/monthly billing toggle, mobile menu) that we'll re-implement as React components.

**What does NOT carry over**

- `image-slot.js` — it's a scaffold for dropping placeholder images during design (persists to a JSON sidecar). In Next.js we replace it with `next/image` and real image URLs.
- Inline `<style>` and `<script>` blocks — these get split into components + Tailwind classes.

---

## 2. Decisions (locked in)

| Area               | Choice                                | Why                                                                                                 |
| ------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Structure**      | Two apps + shared packages            | The real reason to use a monorepo; storefront and admin evolve independently but share UI/types.    |
| **Tooling**        | **Turborepo + pnpm**                  | Industry standard for Next.js monorepos, minimal config, fast caching.                              |
| **Framework**      | **Next.js (App Router) + TypeScript** | Convert JS → TS as we go; server components suit both a storefront and a data-heavy admin.          |
| **Data (for now)** | **Mock / local data**                 | TypeScript data files + in-memory helpers. Design the shapes first; add a real DB in a later phase. |
| **Styling**        | **Tailwind + existing tokens**        | Keep the palette and feel; build faster than hand CSS.                                              |

---

## 3. Target monorepo layout

```
glowroot/
├── apps/
│   ├── storefront/              # Customer-facing Next.js app (glowroot.co)
│   │   ├── app/
│   │   │   ├── page.tsx                 # home (port of GlowRoot.html)
│   │   │   ├── products/[slug]/         # product detail
│   │   │   ├── seasonal/                # fruits & vegetables
│   │   │   ├── combos/                  # boxes & gifting
│   │   │   ├── subscribe/               # subscription plans
│   │   │   ├── cart/  checkout/         # order flow
│   │   │   └── layout.tsx
│   │   └── package.json
│   │
│   └── admin/                   # Internal Next.js app (admin.glowroot.co)
│       ├── app/
│       │   ├── page.tsx                 # dashboard (KPIs)
│       │   ├── orders/                  # list + detail + status + dispatch
│       │   ├── products/                # manage catalog
│       │   ├── materials/               # raw produce inventory / stock
│       │   ├── delivery/                # delivery-partner roster + dispatch board
│       │   ├── locations/               # service areas / delivery map
│       │   ├── staff/                   # staff accounts & roles
│       │   └── layout.tsx
│       └── package.json
│
├── packages/
│   ├── ui/                      # Shared React components (Button, Card, Badge, Nav…)
│   ├── types/                   # Shared TS types (Product, Order, Material, Plan…)
│   ├── data/                    # Mock data + accessor functions (swappable for a real API)
│   ├── config/                  # eslint-config, tsconfig base, tailwind preset (tokens live here)
│   └── utils/                   # formatting (currency ₹), slugify, etc.
│
├── turbo.json                   # Turborepo pipeline (build/dev/lint)
├── pnpm-workspace.yaml          # declares apps/* and packages/*
├── package.json                 # root scripts
└── README.md
```

**Key idea:** `packages/ui` and `packages/types` are imported by _both_ apps (`import { Button } from "@glowroot/ui"`). The Tailwind token theme lives in `packages/config` so both apps share one design language.

---

## 4. Data model (extracted from what you already built)

These types go in `packages/types`. Mock instances go in `packages/data`. When you add a real
backend later, only `packages/data`'s implementation changes — the types and the apps stay the same.

```ts
// A finished thing a customer buys
type Product = {
  slug: string;
  name: string; // "Summer Crush"
  kind: "juice" | "smoothie";
  priceINR: number; // 180
  volumeMl: number; // 100 / 250
  ingredients: string[]; // ["Watermelon","Strawberry","Lime","Mint"]
  description: string;
  imageUrl: string;
  tags: string[]; // ["Peak season","Bestseller"]
  season?: "summer" | "winter" | "all";
  recipe: RecipeItem[]; // ← links product to raw MATERIALS (bill of materials)
};

type RecipeItem = { materialId: string; grams: number };

// Raw produce you track on the admin side ("materials")
type Material = {
  id: string; // "mango"
  name: string; // "Mango (Alphonso)"
  category: "fruit" | "vegetable" | "other";
  unit: "kg" | "g" | "litre";
  stock: number; // current inventory
  reorderLevel: number; // alert threshold
  costPerUnitINR: number;
};

// Bundles / gift boxes
type Combo = {
  slug: string;
  name: string;
  itemSlugs: string[]; // products included
  priceINR: number;
  wasPriceINR?: number;
  quantity: number; // 3 / 6
};

// Subscription plans (the weekly/monthly toggle)
type Plan = {
  slug: string;
  name: string;
  bottlesPerDelivery: number;
  pricing: { weekly: number; monthly: number };
  perks: string[];
  featured?: boolean;
};

// The thing the admin tracks
type Order = {
  id: string;
  customer: { name: string; email: string; phone?: string; address: string };
  items: { productSlug: string; qty: number; priceINR: number }[];
  type: "one-time" | "subscription";
  planSlug?: string;
  status:
    | "pending"
    | "confirmed"
    | "pressing"
    | "out-for-delivery"
    | "delivered"
    | "cancelled";
  totalINR: number;
  createdAt: string;
  deliveryDate: string;
};
```

**The insight that ties the two apps together:** each `Product.recipe` lists the raw
`Material`s it consumes. So when an **order** is placed on the storefront, the admin can
show which materials are being depleted — that's your "track orders and materials" loop.
(You don't have to build the deduction logic in phase 1 — just model it now.)

---

## 5. Styling migration: your tokens → Tailwind

Your CSS variables map almost 1:1 to a Tailwind theme in `packages/config`:

```js
// tailwind-preset.js (shared by both apps)
export default {
  theme: {
    extend: {
      colors: {
        leaf: { DEFAULT: "#2f5d34", deep: "#193d20", soft: "#5a8a4a" },
        carrot: "#d9772e",
        berry: "#7a4a8f",
        apple: "#d4533a",
        gold: "#e8b23f",
        cream: { DEFAULT: "#f6f0e2", 2: "#efe6d2" },
        paper: "#fbf8f0",
        ink: { DEFAULT: "#243018", soft: "#5b6450" },
        line: "#e0d6bf",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "serif"],
        body: ['"Hanken Grotesque"', "sans-serif"],
        script: ['"Caveat"', "cursive"],
      },
    },
  },
};
```

So `background:var(--leaf)` becomes `bg-leaf`, `color:var(--carrot)` becomes `text-carrot`, etc.
The look stays identical; you just gain reusable components.

---

## 6. Component breakdown (from the current page)

Port these sections of `GlowRoot.html` into components — shared ones go in `packages/ui`,
page-specific ones stay in `apps/storefront`:

| Current section                    | Component                                     | Home        |
| ---------------------------------- | --------------------------------------------- | ----------- |
| Header + mega-menu + mobile drawer | `<SiteHeader />`                              | shared      |
| Hero with floating badges          | `<Hero />`                                    | storefront  |
| Seasonal fruits/veg rings          | `<ProduceGrid />` + `<ProduceCard />`         | storefront  |
| "How it's made" steps              | `<ProcessSteps />`                            | storefront  |
| Juice carousel                     | `<ProductCarousel />` + `<ProductCard />`     | shared card |
| New arrivals (smoothie)            | `<FeatureCard />`                             | storefront  |
| Combos + bundle picker             | `<ComboHero />`, `<BundleCard />`             | storefront  |
| Benefits band (stats)              | `<StatsBand />`                               | shared      |
| Subscription plans + toggle        | `<PlanGrid />` + `<BillingToggle />` (client) | storefront  |
| Footer                             | `<SiteFooter />`                              | shared      |

Interactions that must be **client components** (`"use client"`): carousel, billing toggle,
mobile menu, cart.

---

## 7. Phased roadmap

Build in vertical slices so you always have something running.

### Phase 0 — Monorepo skeleton

- `pnpm init`, add `pnpm-workspace.yaml`, install Turborepo.
- Scaffold `apps/storefront` and `apps/admin` with `create-next-app` (TS + Tailwind).
- Create empty `packages/{ui,types,data,config,utils}` and wire workspace imports.
- ✅ Done when: `pnpm dev` runs both apps on different ports.

### Phase 1 — Storefront port (frontend only)

- Move tokens into `packages/config` Tailwind preset.
- Port the home page section-by-section into components.
- Put mock products/produce/combos/plans in `packages/data` (typed via `packages/types`).
- Copy `assets/` into `apps/storefront/public`, swap `<image-slot>` for `next/image`.
- ✅ Done when: the home page looks like `GlowRoot.html` but is data-driven.

### Phase 2 — Storefront depth

- Product detail pages (`/products/[slug]`), seasonal, combos, subscribe pages.
- Cart (client state) + a checkout form that creates a mock `Order`.
- ✅ Done when: you can "place" an order (stored in memory/localStorage).

### Phase 3 — Admin app

- Dashboard with KPI tiles (orders today, revenue, low-stock materials).
- Orders list + detail + status changes.
- Products management + Materials (inventory) list with reorder alerts.
- Reuse `packages/ui` and `packages/types`; read from the same `packages/data`.
- ✅ Done when: an order placed in storefront shows in admin (shared data layer).

### Phase 4 — Real backend (later, out of scope for now)

- Swap `packages/data` internals for API routes / server actions + Postgres + Prisma.
- Add auth (admin login), payments, real inventory deduction from `Product.recipe`.

---

## 8. Getting started (once we scaffold)

```bash
# from repo root
pnpm install
pnpm dev            # turbo runs storefront + admin together
pnpm --filter storefront dev   # run just one app
pnpm build          # turbo builds all, with caching
pnpm lint
```

Ports (suggested): storefront `:3000`, admin `:3001`.

---

## 9. Open questions to revisit later

- **Auth for admin** — simple password now, real auth (NextAuth) in Phase 4.
- **Payments** — mock in Phase 2; Razorpay/Stripe when there's a backend.
- **Images** — keep in `public/` for now; move to a CDN/storage if the catalog grows.
- **Deployment** — Vercel makes two-app monorepos easy (one project per app).

---

## 10. Learning notes

This project is intentionally a good monorepo teaching vehicle because it has **two real
consumers of shared code** (storefront + admin). Focus your learning on:

1. How pnpm workspaces + Turborepo link packages and cache tasks.
2. How to design a `types` package that both apps depend on.
3. How to keep a `data` package's _interface_ stable while its _implementation_ changes
   (mock → real DB). This is the single most valuable habit here.

```

```
