# GlowRoot

A cold-pressed juice brand built as a **Turborepo + pnpm** monorepo: a
customer-facing **storefront** and an internal **admin** panel that share UI,
types and a swappable data layer.

This is the built form of the plan in [`docs/frontend.md`](./docs/frontend.md)
and the UX contract in [`docs/customer-journey.md`](./docs/customer-journey.md).
The original prototype (`GlowRoot.html`) has been broken into reusable
components with all products, plans, materials and combos moved into typed data.

## Layout

```
glowroot/
├── apps/
│   ├── storefront/   # customer site (Next.js App Router)  :3000
│   └── admin/        # internal panel (Next.js App Router)  :3001
├── packages/
│   ├── ui/           # shared React components (Button, Badge, Card, ProductCard, StatsBand…)
│   ├── types/        # shared domain types (Product, Order, Material, Plan…)
│   ├── data/         # mock data + accessor functions (swappable for a real API)
│   ├── config/       # tailwind preset (design tokens) + tsconfig base
│   └── utils/        # formatting (₹), slugify, dates
├── turbo.json
└── pnpm-workspace.yaml
```

## Getting started

```bash
pnpm install
pnpm dev            # turbo runs storefront (:3000) + admin (:3001)
pnpm --filter storefront dev   # run just one app
pnpm build          # build all, with turbo caching
pnpm typecheck
pnpm lint
pnpm format         # format source files with Prettier
pnpm format:check   # check formatting without changing files
pnpm audit --prod
```

For release status, completed hardening, and launch blockers, see
[`docs/production-readiness.md`](./docs/production-readiness.md). The current
build is suitable for hardened staging, not a public production launch.

The admin app has a dedicated `/login` flow backed by individual staff accounts
in Postgres (invitation, password reset, database-backed sessions and
role-based permissions); see [`apps/admin/.env.example`](./apps/admin/.env.example)
for `DATABASE_URL` and [`docs/admin-rbac.md`](./docs/admin-rbac.md) for the role
matrix. Protected routes fail closed.

Customer profiles, orders and storefront login sessions also use PostgreSQL.
See [customer database setup and access](docs/customer-database.md) for the
migration/import commands and the Super Admin/Admin-only customer directory.

## How the two apps connect

The storefront's `/stores` page searches the shops saved in Admin → Stores by
name, city, street address or pincode. Selecting a shop shows a green GlowRoot
marker and directions. An incomplete address falls back to a clearly labeled
approximate pincode area; no exact shop coordinates are invented.

The map uses `NEXT_PUBLIC_GOOGLE_MAPS_KEY` with Maps JavaScript API and Geocoding
API enabled. It defaults to the project's JavaScript/vector Map ID
`f7b20891dabcb4eb3b24db33`; set `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` in the storefront
environment to override it. Restart the development server after changing these
environment values. Admin location autocomplete additionally uses Places API (New).

Both apps import from `@glowroot/types` and read through `@glowroot/data`'s
accessor functions (`getProducts()`, `getOrders()`, …). Each `Product` carries a
`recipe` of raw `Material`s (a bill of materials), so an order placed on the
storefront maps to the inventory the admin tracks.

`@glowroot/data` currently returns mock data from memory, with orders, users,
the delivery map (service areas) and the delivery-partner roster persisted to
JSON files at the repo root so both processes see the same state — which is what
lets the admin's Locations screen change what the storefront tells a customer
about their pincode.
When a real backend lands, only that package's _implementation_ changes — the
types and both apps stay the same.

[`docs/backend.md`](./docs/backend.md) documents the server side in full: the
data-layer API, the file-backed stores, the four write paths (checkout, auth,
status change, profile save), the PBKDF2 auth and its interim trust model, the
mock payment gateway, and the Phase 4 gaps.

## What was ported from the prototype

| Prototype section                  | Component                                  |
| ---------------------------------- | ------------------------------------------ |
| Header + mega-menu + mobile drawer | `SiteHeader` (storefront)                  |
| Hero with floating badges          | `Hero`                                     |
| Seasonal fruit/veg rings           | `SeasonalSection` + `ProduceCard`          |
| "How it's made" steps              | `ProcessSteps`                             |
| Juice carousel                     | `ProductCarousel` + `ProductCard` (shared) |
| New arrivals (smoothie)            | `FeatureCard`                              |
| Combos + bundle picker             | `CombosSection` + `BundleCard`             |
| Benefits band                      | `StatsBand` (shared)                       |
| Subscription plans + toggle        | `PlanGrid` (client)                        |
| Footer                             | `SiteFooter`                               |

Plus the journey the prototype only hinted at: a non-blocking pincode control
with a soft serviceability banner, a cart drawer, and a delivery-first checkout
(one-time and subscription) that creates an `Order`.

```

```
