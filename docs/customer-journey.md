# GlowRoot — Customer Journey & Ordering Flow

> How a customer interacts with the storefront: from landing, to browsing, to placing a
> one-time order or starting a weekly/monthly subscription. This is the UX contract the
> `apps/storefront` build follows. See [`frontend.md`](./frontend.md) for the architecture.

---

## Decisions (locked in)

| Area                       | Choice             | Meaning                                                                                                                                          |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Entry / serviceability** | **Hybrid**         | Never gate the catalog. Pincode is a non-blocking header control; serviceability is a _soft_ hint while browsing and a _hard_ check at checkout. |
| **Home page intent**       | **Both, balanced** | One-time (combos/boxes) and subscription (plans) get equal weight and cross-link to each other.                                                  |

**Why hybrid, not a pincode gate:** the landing page is the strongest marketing asset — gating
it kills first impressions and SEO. But juice is perishable and delivery-day dependent, so we
still must confirm serviceability _before money changes hands_. Hybrid gets both.

---

## The two purchase modes

The site has **two parallel intents**, both reachable from the home page, both ending at the
same checkout:

1. **One-time** — try / gift / no commitment → single bottles, combos, gift boxes.
2. **Subscription** — the repeat-revenue path → weekly or monthly plans.

---

## Full journey map

```
                     ┌───────────────────────────────────────────┐
   Land on home ────▶│  Browse freely — hero, seasonal, juices,   │
   (NO gate)         │  combos, plans.                            │
                     │  Header: "Deliver to: [set pincode]"       │
                     │  (optional, non-blocking)                  │
                     └───────────────────┬───────────────────────┘
                                         │
                     ┌───────────────────┴───────────────────┐
                     ▼                                         ▼
            ONE-TIME PATH                             SUBSCRIPTION PATH
       (try / gift / no commitment)              (weekly / monthly, recurring)
                     │                                         │
     Pick juices / combo / gift box            Open "Plans" → toggle Weekly | Monthly
                     │                                         │
     Add to Cart ──▶ Cart drawer               Pick a plan (Starter / Daily Glow / Family)
                     │                                         │
     Checkout:                                 Configure plan:
       1. Pincode  → HARD serviceability         • bottles / blends (mix & match)
       2. Delivery date + slot                    • frequency + start date + delivery days
       3. Address + contact                                   │
       4. Pay (mock in Phase 2)                 Checkout:
                     │                             1. Pincode → HARD serviceability
                     │                             2. Address + contact
                     │                             3. Pay + confirm recurring
                     ▼                                         ▼
              Order created  ───────────────────────▶  Appears in admin (Phase 3)
                                                        depletes Materials via recipe
```

---

## Serviceability rules (the hybrid contract)

| Where                             | Behavior                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Home / catalog / product pages    | **No check.** Fully browsable by anyone.                                                                                         |
| Header pincode control            | Optional. If set, show a soft banner when out of area ("We're not in your area yet — join the waitlist"). Never blocks browsing. |
| Add to Cart                       | Allowed regardless of pincode.                                                                                                   |
| **Checkout / start subscription** | **Hard check.** Must have a serviceable pincode + a valid delivery date/slot before payment.                                     |

Serviceable pincodes are managed in the admin **Locations** screen and stored in
`.glowroot-zones.json`. Coverage runs in one of two modes: _nationwide_ (any valid 6-digit
pincode, the default) or _listed areas only_. Either way, an area operations has **paused** is
refused, and each area carries its own press-and-deliver lead time and COD rule. The storefront
reads that map on every page load, so a change in the admin is visible to customers immediately.

---

## Checkout is delivery-first (perishable goods)

Unlike normal e-commerce shipping, **delivery date + slot is a first-class checkout step**,
because juice is pressed-to-order:

- Customer picks a **delivery date** (respecting a press-and-deliver lead time, e.g. next-day).
- Customer picks a **time slot** (e.g. morning delivery).
- This is the one place serviceability is strictly enforced — no order for an area/date we
  can't fulfill.

---

## Where the weekly/monthly toggle lives

The billing toggle already built in the design belongs on the **plan card, before checkout**:
the customer chooses cadence there, then the plan-config step confirms start date and delivery
days. Cadence is _not_ asked again at checkout — checkout only collects pincode, address, and
payment.

---

## Data touchpoints (ties to `frontend.md` types)

| Step                 | Type involved                                                                       |
| -------------------- | ----------------------------------------------------------------------------------- |
| Browse products      | `Product`                                                                           |
| Serviceability check | `ServiceArea` map in `.glowroot-zones.json` (admin-managed)                         |
| One-time order       | `Order` (`type: "one-time"`)                                                        |
| Subscription         | `Order` (`type: "subscription"`, `planSlug` set) + `Plan`                           |
| Admin sees order     | `Order` → depletes `Material` via `Product.recipe`                                  |
| Dispatch             | `DeliveryPartner` assigned to `Order.partnerId`, matched on `Order.deliveryPincode` |

---

## Build order (fits the phased roadmap)

- **Phase 1** — browsable catalog, header pincode control (soft banner only).
- **Phase 2** — cart, one-time checkout (with hard serviceability + delivery date/slot),
  plan config + subscription checkout. Orders stored in mock data.
- **Phase 3** — orders surface in the admin app.

```

```
