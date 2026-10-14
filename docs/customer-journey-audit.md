# Customer journey audit — 12 September 2026

## Verdict

The app contains the main screens for a one-time purchase, but a complete customer lifecycle cannot yet be signed off without important gaps. Subscription ordering is materially incomplete. This is an implementation and limited browser review, not a passed end-to-end purchase test.

Scope: home → product → cart → account → delivery eligibility → checkout → payment → confirmation → fulfilment → tracking → support/repeat purchase. Reviewed the parallel subscription path against `customer-journey.md`.

## Verification performed

- Browser: home and Summer Crush product page render; product addition updates the basket and total; the basket checkout route leads into the login flow. Login displays a non-interactive “Forgot?” label and a “Continue as guest” link to the home page.
- Source: traced checkout validation, server pricing, mock payment, order persistence, confirmation, customer order reads, admin status transitions, partner assignment, subscription configuration and customer-facing claims.
- Storefront TypeScript check passed.
- Storefront ESLint check passed.
- No customer account was created and no order was submitted during this review. Authenticated checkout, payment decline/retry, admin dispatch and delivery were inspected in code, not verified as a single browser transaction. Mobile/accessibility coverage and a production build were not performed.

## Journey coverage

| Step                | Existing functionality                                                      | Gap to close                                                                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discover and choose | Catalog, product price/volume/ingredients, product detail, boxes and plans  | Product pages lack explicit storage, consume-by and allergen guidance. The product page exposes admin inventory implementation text and incorrectly claims orders deplete materials.                                                            |
| Cart                | Add, quantity changes, removal, local persistence, total                    | Client quantities are unrestricted while checkout rejects over 20 per line or 50 total units. Align limits before the customer reaches payment. Stored cart prices can differ from server prices; obtain an authoritative quote before payment. |
| Account             | Signup, login, server sessions, checkout return URL, saved profile          | Password reset is absent; “Forgot?” is only a label. “Continue as guest” returns home, while placing an order requires an account. Clarify guest browsing versus checkout.                                                                      |
| Delivery            | Server-side pincode, area lead time, slot-label and COD eligibility checks  | No inventory reservation, delivery cutoff or slot-capacity enforcement. Date validation checks formatting and string ordering rather than a real calendar date. Unsupported-area waitlist links to plans instead of collecting interest.        |
| Payment and order   | Server pricing, simulated UPI/card, COD, simulated decline, persisted order | No real provider or payment reconciliation. No duplicate-request protection or atomic payment/order/profile save. Unexpected action rejection leaves the client submitting state unresolved.                                                    |
| Confirmation        | Owned-order lookup, delivery details, total and payment reference           | Invalid/missing/unauthorized order lookup still renders “Order confirmed” and “your order is in.” Combo, produce and configured-box names fall back to internal slugs; success omits configured-box contents.                                   |
| Fulfilment          | Admin status progression and delivery-partner assignment, customer timeline | Order creation does not reserve/decrement materials. Marking an order delivered does not record COD collection. Partner capacity is not enforced.                                                                                               |
| After purchase      | Account order list/detail and public ID-plus-email tracking                 | No implemented receipts/delivery notifications, customer cancellation request, refund workflow, issue-resolution flow or one-tap reorder. Support phone and Instagram are placeholders.                                                         |
| Subscription        | Weekly/monthly price, start date and weekday selection                      | Weekdays are displayed but never submitted; cycle affects price but is not persisted. No blend selection, bottle allocation, recurring deliveries/billing or pause/skip/cancel controls despite marketing promises.                             |

## Prioritized findings and source evidence

### P1 — Finish the order/payment lifecycle

`apps/storefront/app/checkout/actions.ts` implements a simulated charge. It saves the order and customer profile separately, with no request idempotency. If order save succeeds but profile save fails, the customer does not receive success even though the order exists; retrying can create another order. `apps/storefront/components/CheckoutClient.tsx` awaits the action without catch/finally, so a rejected request can strand the button in its submitting state.

`packages/data/src/store.ts` changes delivery status without updating payment. A COD order can be marked delivered and retain payment status `pending`. Cancellation also only changes order status, while `apps/storefront/components/OrderTimeline.tsx` tells the customer that paid money is refunded. Implement collection/refund records and render their actual state.

### P1 — Make accepted delivery promises fulfilable

`packages/data/src/index.ts` delegates `addOrder` directly to `appendOrder`; there is no stock reservation or decrement. `packages/data/src/store.ts` persists orders with a read-modify-write JSON operation, without concurrency control. Checkout validates a slot label but does not reserve capacity. Establish authoritative stock/slot checks and durable transactions before accepting real orders.

### P1 — Save and fulfil subscription choices

`apps/storefront/components/PlanConfigForm.tsx` sends days in the checkout URL. `CheckoutClient.tsx` only displays those days; the `placeOrder` input has no weekday field. `apps/storefront/app/checkout/actions.ts` calculates the selected cycle price, stores an empty item array and omits cycle from the saved order. The fulfilment record cannot reproduce what the customer chose. Define a persisted subscription, bottle allocation, schedule and management actions before enabling the advertised recurring service.

### P2 — Correct confirmation and purchased-item details

`apps/storefront/app/checkout/success/page.tsx` renders success language outside the `order` guard. Missing orders need an explicit not-found or login state. This page and `apps/storefront/app/account/actions.ts` resolve item names only from products, so combos/produce/custom boxes display internal identifiers. Resolve all catalog types and preserve an order-time display snapshot, including box contents.

### P2 — Close recovery and misleading navigation gaps

`apps/storefront/components/AuthForm.tsx`: implement password recovery and accurately label guest navigation. `SoftServiceBanner.tsx`: connect a real waitlist. `SiteFooter.tsx`: replace placeholder contact details, wire the social link and supply customer policy pages. `PlanGrid.tsx` and `AuthForm.tsx`: deliver advertised subscription controls/reorder or revise the promises. Add explicit customer handling for session expiry during checkout, unavailable items and changed prices.

## Acceptance checklist for one complete one-time journey

Use an explicitly identified test customer and one serviceable delivery area. Start with a single bottle and COD, then repeat with a provider sandbox payment when integrated.

- [ ] Browse product information, add an item, increase/decrease quantity and remove/re-add it.
- [ ] Reload and confirm cart retention; limits and pricing remain consistent with the server.
- [ ] Sign up/log in, return to checkout with the same cart, and recover a forgotten password.
- [ ] Verify unsupported/paused areas cannot submit, and eligible areas show their true dates, slots and payment methods.
- [ ] Validate address/contact, invalid dates and unavailable delivery slots with actionable messages.
- [ ] Review an authoritative itemized total, delivery charge/tax treatment and applicable customer policies before submission.
- [ ] Submit once; repeat a request or simulate a connection interruption and verify exactly one order results.
- [ ] Verify a declined payment preserves the cart and can be retried; a successful payment matches the order amount/reference.
- [ ] Confirm the saved order, correct item names, box contents if applicable, delivery address/pincode and payment state.
- [ ] Verify the same order appears in admin and stock/slot reservations are recorded exactly once.
- [ ] Assign a suitable partner and advance confirmed → pressing → out for delivery → delivered; verify customer tracking at each step.
- [ ] Record COD collection, or reconcile the prepaid payment, and issue the receipt.
- [ ] Verify cancellation/refund and failed-delivery handling on separate test orders, with truthful customer status messages.
- [ ] Verify support contact and reorder; confirm another account cannot read the order.
- [ ] Repeat the core route on mobile and with keyboard navigation.

Do not mark this checklist complete based solely on lint/typecheck or the presence of screens. Keep subscription acceptance separate until schedule persistence and recurring fulfilment exist.
