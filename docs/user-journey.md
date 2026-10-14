# GlowRoot — Consumer Journey: Status & Open Questions

> A **status review** of the customer-facing journey: which flows are actually built and
> working in `apps/storefront`, and which decisions still need to be made before the journey
> hangs together end-to-end.
>
> This is the companion to [`customer-journey.md`](./customer-journey.md) (the UX _contract_)
> and [`frontend.md`](./frontend.md) (the _architecture_). Where implementation and contract
> disagree, it's called out below.

**Legend** — ✅ built & working · 🟡 partly built / mocked · ⛔ not built · ❗ contract vs. code mismatch

---

## Part 1 — Flow status

### A. Discover & browse

| #   | Flow                                  | Status | Where it lives                                                                                                                                    | Notes                                                                                                                                       |
| --- | ------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Land on home, browse freely (no gate) | ✅     | `app/page.tsx` + `components/Hero`, `SeasonalSection`, `ProcessSteps`, `ProductCarousel`, `CombosSection`, `PlanGrid`, `BenefitsBand`, `FinalCta` | Matches the "never gate the catalog" decision.                                                                                              |
| A2  | Shop mega-menu + mobile drawer        | ✅     | `components/SiteHeader.tsx`                                                                                                                       | Two-column Shop panel (Seasonal / Juices & bundles) + `primaryLinks`.                                                                       |
| A3  | Juice catalog listing                 | ✅     | `app/products/page.tsx`                                                                                                                           |                                                                                                                                             |
| A4  | Product detail page                   | ✅     | `app/products/[slug]/page.tsx`                                                                                                                    |                                                                                                                                             |
| A5  | Seasonal fruits & vegetables          | ✅     | `app/seasonal/page.tsx`, `ProduceCard`                                                                                                            | Anchors `#fruits` / `#vegetables` wired from the menu.                                                                                      |
| A6  | Combos & gift boxes listing           | ✅     | `app/combos/page.tsx`, `app/combos/[slug]/page.tsx`, `BundleCard`                                                                                 |                                                                                                                                             |
| A7  | Build-your-own box                    | ✅     | `app/combos/menu/page.tsx` → `ComboMenu`, `BoxBuilder`                                                                                            | Pre-selects the clicked box via `?box=`; produces a config-unique cart slug (`bundle::fingerprint`) so different fills stay separate lines. |
| A8  | Header pincode control (soft hint)    | 🟡     | `PincodeControl`, `SoftServiceBanner`, `StoreProvider`                                                                                            | Built and persisted, but **currently a no-op** — see Q5.                                                                                    |

### B. Cart

| #   | Flow                                         | Status | Where it lives                                     | Notes                                         |
| --- | -------------------------------------------- | ------ | -------------------------------------------------- | --------------------------------------------- |
| B1  | Add to cart from card / detail / box builder | ✅     | `AddToCartButton`, `ProductCard`                   |                                               |
| B2  | Cart drawer (view, qty, remove)              | ✅     | `CartDrawer`, `CartButton`, `CartIsland`           |                                               |
| B3  | Cart survives reload                         | ✅     | `StoreProvider` → `localStorage` (`glowroot.cart`) | Pincode persisted too (`glowroot.pincode`).   |
| B4  | Fly-to-cart / bounce animation               | ✅     | `StoreProvider.flyToCart` + `.fly-bubble` CSS      | Closes `key-improvements.md` item 4.          |
| B5  | Standalone `/cart` page                      | ⛔     | —                                                  | Drawer only; `/cart` is not a route. See Q10. |

### C. One-time order

| #   | Flow                                          | Status | Where it lives                                                                     | Notes                                                                |
| --- | --------------------------------------------- | ------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| C1  | Checkout: pincode → date/slot → address → pay | ✅     | `app/checkout/page.tsx`, `CheckoutClient`                                          | Four numbered steps exactly as the contract describes.               |
| C2  | Inline field validation                       | ✅     | `CheckoutClient.fieldErrors` + touched/attempted-submit gating                     | Closes `key-improvements.md` item 2.                                 |
| C3  | Hard serviceability check at checkout         | 🟡❗   | `app/checkout/actions.ts` → `isServiceable`                                        | The check runs, but the allow-list is bypassed — see Q5.             |
| C4  | Delivery date + time slot                     | 🟡❗   | `CheckoutClient`, `deliverySlots`                                                  | Slots work. The date input is pinned to **today only** — see Q4.     |
| C5  | Payment                                       | 🟡     | `CheckoutClient` step 4                                                            | Explicitly mocked; placing the order confirms it.                    |
| C6  | Order created and persisted                   | ✅     | `placeOrder` → `addOrder` → `packages/data/src/store.ts` → `.glowroot-orders.json` | File-backed so storefront and admin share one source of truth.       |
| C7  | Confirmation page                             | ✅     | `app/checkout/success/page.tsx`                                                    | Order ID, est. delivery + slot, status, items, delivering-to, total. |
| C8  | Order appears in admin                        | ✅     | `apps/admin/app/orders/*`                                                          | Status changer + dashboard KPIs + materials.                         |

### D. Subscription

| #   | Flow                                               | Status | Where it lives                          | Notes                                                                                                                                                                             |
| --- | -------------------------------------------------- | ------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Plans page + weekly/monthly toggle                 | ✅     | `app/subscribe/page.tsx`, `PlanGrid`    | Cadence chosen on the plan card, per the contract.                                                                                                                                |
| D2  | Plan detail                                        | ✅     | `app/subscribe/[slug]/page.tsx`         |                                                                                                                                                                                   |
| D3  | Plan config: start date + delivery days            | ✅     | `PlanConfigForm`                        | Earliest start = tomorrow; days default to Mon/Thu.                                                                                                                               |
| D4  | Plan config: mix & match bottles / blends          | ⛔❗   | —                                       | The contract lists this as part of plan config; the form doesn't collect it. See Q8.                                                                                              |
| D5  | Subscription checkout                              | 🟡     | `CheckoutClient` in `subscription` mode | Collects pincode + first delivery + address; total = `plan.pricing[cycle]`.                                                                                                       |
| D6  | Recurring subscription actually stored             | ⛔❗   | `placeOrder`                            | Writes **one** `Order` with `items: []`; `cycle`, `start`, and `days` are used for display/pricing then dropped. No recurrence, no subscription entity. **Biggest gap** — see Q7. |
| D7  | Manage subscription (pause / skip / swap / cancel) | ⛔     | —                                       | See Q7.                                                                                                                                                                           |

### E. Identity & account

| #   | Flow                                        | Status | Where it lives                                                              | Notes                                                                                                                                                                         |
| --- | ------------------------------------------- | ------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Log in (interim, email-matched)             | 🟡     | `app/login/page.tsx`, `AuthForm`, `login/actions.ts` → `getCustomerByEmail` | Matches email against existing orders; password is checked for presence only. Real credentials = Phase 4.                                                                     |
| E2  | Sign up                                     | 🟡     | `signUp` in `login/actions.ts`                                              | Session-only; no user record is persisted.                                                                                                                                    |
| E3  | Session persists across reloads             | ✅     | `AuthProvider` → `localStorage` (`glowroot.session`)                        |                                                                                                                                                                               |
| E4  | Account chip + log out in header            | ✅     | `AccountControl`, `MobileAccount` in `SiteHeader`                           |                                                                                                                                                                               |
| E5  | Reach `/login` from the UI when logged out  | ⛔❗   | `SiteHeader.tsx:26`, `:82`                                                  | Both account components `return null` when not signed in, so **`/login` is only reachable by typing the URL**. See Q2.                                                        |
| E6  | Order history / "my orders"                 | ⛔❗   | —                                                                           | `AuthForm.tsx:56` sells "See past & live orders, with delivery status"; there is no `/account` or `/orders` route and `getOrdersByEmail` is unused by the storefront. See Q1. |
| E7  | Checkout prefilled for a signed-in customer | ⛔     | `CheckoutClient` never calls `useAuth`                                      | Name/email/phone/address are always blank. See Q3.                                                                                                                            |
| E8  | Saved addresses / address book              | ⛔     | —                                                                           | See Q3.                                                                                                                                                                       |

### F. Post-purchase & edges

| #   | Flow                                              | Status | Notes                                                                          |
| --- | ------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| F1  | Track my order after leaving the success page     | ⛔     | Status lives in admin only; the customer has no way back in. See Q1.           |
| F2  | Reorder / "order this again"                      | ⛔     | Needs order history first.                                                     |
| F3  | Cancel or change an order                         | ⛔     | `cancelled` exists as an admin status; the customer can't trigger it. See Q13. |
| F4  | Confirmation email / SMS / WhatsApp               | ⛔     | Confirmation is on-screen only. See Q11.                                       |
| F5  | Out-of-area waitlist capture                      | ⛔❗   | The contract promises "join the waitlist"; nothing captures it. See Q5.        |
| F6  | Empty cart, unknown order, invalid pincode states | ✅     | Handled in `CartDrawer`, success page, and `CheckoutClient`.                   |

---

## Part 2 — Big points to discuss

Ordered roughly by how much they block a coherent journey.

### Q1 — Where does a customer see their own orders?

**The gap:** the login screen's own selling point is "See past & live orders, with delivery
status" (`AuthForm.tsx:56`), but there is no account area. `getOrdersByEmail()` already exists
in `packages/data` and nothing calls it. Today, once you leave `/checkout/success` your order
is unreachable — F1, F2, F3 all depend on this.
**To decide:** scope of the account area — is it just `/account/orders` (list + detail +
status timeline), or a fuller account hub (profile, addresses, subscriptions)?
**Leaning:** build `/account/orders` first; it's a thin page over an accessor that exists, and
it unblocks tracking, reorder, and cancel.

### Q2 — Should logged-out users be able to find the login page?

**The gap:** `AccountControl` and `MobileAccount` both bail out when `!customer`, so the header
shows nothing and `/login` is URL-only. `MobileAccount`'s own docstring says "Log in link, or
name + Log out" — the link was intended and isn't there.
**To decide:** was hiding login deliberate (keep the storefront frictionless until there's real
auth), or an oversight? If deliberate, say so in the contract so it stops reading as a bug.

### Q3 — Guest checkout vs. account checkout

**The gap:** checkout is effectively guest-only. `CheckoutClient` doesn't read the session, so a
signed-in customer retypes name, email, phone, and address every time.
**To decide:** (a) prefill from session — cheap, obvious win; (b) does placing an order as a
guest create/attach an account? (c) do we store multiple addresses, or one "last used"?

### Q4 — What is the real delivery-date rule?

**The gap:** three sources disagree.

- `CheckoutClient.tsx:173–174` pins the date input to `min={today} max={today}` — today only.
- `deliveryLeadDays = 1` and `earliestDeliveryDate()` say tomorrow-onwards; both are **unused**.
- `PlanConfigForm` sets a subscription start of _tomorrow_, which checkout then renders as a
  value outside its own `min`/`max` — so subscription mode is internally inconsistent.

**To decide:** the actual press-and-deliver rule, including the daily cutoff (e.g. "order before
8pm → next-day delivery; after → day after"), how far ahead a customer may book, and which days
we don't deliver. Then make `earliestDeliveryDate()` the single source of truth and delete the
hardcoded `today`.

### Q5 — Serviceability is currently switched off

**The gap:** `acceptAllPincodes = true` (`serviceability.ts:36`) makes any 6-digit pincode pass,
so the allow-list, the soft out-of-area banner, and the whole "hybrid" contract are never
exercised in practice.
**To decide:** when do we flip it back, and what exactly happens to an out-of-area visitor?
The contract promises a waitlist; there is no waitlist capture (F5). Options: capture email +
pincode into a waitlist store, or soft-warn only and let them order anyway.

### Q6 — Does the journey need a serviceability check _before_ the cart?

Related to Q5 but a separate call: today someone in an unserviceable area can browse, add to
cart, fill in the entire checkout form, and only then be blocked. That's the intended hybrid
design — worth confirming it still feels right, or whether the soft banner should escalate
(e.g. a persistent strip once a known-bad pincode is set).

### Q7 — A subscription isn't a subscription yet ⚠️ biggest gap

**The gap:** `placeOrder` writes a single `Order` with `type: "subscription"`, `items: []`, and a
plan slug. The cycle, start date, and delivery days are used to price and display, then thrown
away. Consequences: no second delivery is ever generated; there's no entity to pause, skip, or
cancel; and admin can't tell what to press for a subscriber.
**To decide:** the model. Options:

1. A `Subscription` entity (plan, cycle, start, days, bottle mix, status) that _generates_ Orders
   per delivery — correct, more work.
2. Keep one Order but persist `cycle`/`start`/`days` on it and generate the next one manually in
   admin — cheap, buys the demo, defers the design.

**Leaning:** option 1, because D7, F1, and the admin "what do we press tomorrow" view all lean on
it, and the shape is easier to get right before there's data to migrate.

### Q8 — Do subscribers pick their bottles?

The contract lists "bottles / blends (mix & match)" as part of plan config; `PlanConfigForm`
collects only start date and delivery days, and the success page says bottles "are mixed & matched
each delivery" — i.e. we choose. Decide which it is: curated-by-us, customer-picked, or
customer-picked with a default. This also determines whether admin can compute material depletion
for subscriptions at all.

### Q9 — Terminology: "Add to Cart" or "Add to order"?

`key-improvements.md` item 3 asks for "Add to order"; the code still says `Add to Cart`
(`AddToCartButton.tsx:14`, `ComboMenu.tsx:216`). Cheap to change, but it should be decided once
and applied everywhere — button labels, the drawer title, and the cart/order noun in copy.

### Q10 — Cart drawer only, or a `/cart` page too?

No `/cart` route exists, so a cart link can't be shared or deep-linked and there's no full-page
review step before checkout. Fine for a drawer-first design; worth an explicit decision.

### Q11 — Confirmation and notifications

Right now confirmation exists only as an on-screen page — no email, no SMS/WhatsApp, no
delivery-day reminder. Decide the minimum set for a believable journey (order confirmation is
probably table stakes) and where it plugs in (`placeOrder` is the natural seam).

### Q12 — Payment

Mocked by design in this phase. Open: gateway (Razorpay is the natural India default), and how
recurring charges work for subscriptions — which interacts directly with Q7. Also: what the
failed-payment path looks like, since today success is unconditional.

### Q13 — Cancellation and change window

`Order.status` includes `cancelled`, but only admin can set it. Decide whether customers can
cancel or edit, and until when (e.g. "up to 8pm the night before, because we press in the
morning") — the cutoff should be the same rule chosen in Q4.

### Q14 — Navigation consolidation

`key-improvements.md` item 1 ("remove separate navigation to combine navigation") — the Shop
mega-menu now groups Seasonal and Juices & bundles, so this looks addressed. Confirm it's done
and close the item, or say what's still split.

---

## Suggested next slice

If the goal is "the consumer journey holds together end to end", the smallest high-value order is:

1. **Q4** — fix the delivery-date rule (it's currently self-contradictory and blocks correct subscriptions).
2. **Q1 + Q2** — `/account/orders` and a Log in entry point; makes the auth work already built pay off.
3. **Q3(a)** — prefill checkout from the session.
4. **Q7** — decide and build the subscription model.
5. **Q5** — decide the out-of-area experience, then flip `acceptAllPincodes` off.
