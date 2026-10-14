# GlowRoot — Backend

The server side of GlowRoot, as it stands today. Sibling document to
[`frontend.md`](./frontend.md) (the build plan) and
[`customer-journey.md`](./customer-journey.md) / [`user-journey.md`](./user-journey.md)
(the UX contract).

This describes **what exists**, not what a production system would look like.
Where the two differ, that's called out under _Gaps_ — those are Phase 4 work.

---

## 1. There is no separate backend service

GlowRoot has no Express app, no API server, no database process. The "backend"
is two things:

1. **Next.js server actions** (`"use server"` files inside each app) — the only
   entry points that mutate anything.
2. **`packages/data`** — the data layer both apps import. Its _interface_ is the
   contract; its _implementation_ is disposable.

Everything server-side runs inside the two Next.js processes (storefront `:3000`,
admin `:3001`). Persistence is two JSON files at the repo root.

This was deliberate. The single most valuable property of the design is that
`@glowroot/data`'s accessor signatures are already the shape a real backend
would expose — all async, all returning domain types from `@glowroot/types`.
Swapping the bodies for Prisma queries or `fetch()` calls changes nothing above
them.

```
┌──────────────────┐        ┌──────────────────┐
│ storefront :3000 │        │   admin :3001    │
│  RSC + actions   │        │  RSC + actions   │
└────────┬─────────┘        └─────────┬────────┘
         │                            │
         └──────────┬─────────────────┘
                    ▼
        ┌───────────────────────────┐
        │  @glowroot/data           │  ← the swappable seam
        │  getProducts, addOrder,   │
        │  verifyUser, …            │
        └───────┬───────────┬───────┘
                │           │
        ┌───────▼──┐   ┌────▼───────────────┐
        │ in-memory│   │ file-backed stores │
        │  seeds   │   │ store.ts / users.ts│
        │ products │   └────┬───────────────┘
        │ materials│        │
        │ combos   │   .glowroot-orders.json
        │ plans    │   .glowroot-users.json
        │ produce  │   .glowroot-zones.json
        │          │   .glowroot-partners.json
        │          │        (repo root)
        └──────────┘
```

---

## 2. Storage

| What                                                 | Where                                             | Mutable?                 |
| ---------------------------------------------------- | ------------------------------------------------- | ------------------------ |
| Products, produce, combos, bundles, plans, materials | TS modules in `packages/data/src/*.ts`, in memory | No — read-only catalogue |
| Orders                                               | `.glowroot-orders.json` at repo root              | Yes                      |
| Users                                                | `.glowroot-users.json` at repo root               | Yes                      |
| Service areas + coverage mode                        | `.glowroot-zones.json` at repo root               | Yes — admin Locations    |
| Delivery partners                                    | `.glowroot-partners.json` at repo root            | Yes — admin Delivery     |
| Cart, pincode, client session                        | browser `localStorage`                            | Yes (client only)        |

**Why the repo root.** Storefront and admin are two separate Node processes.
They can't share a module-level array, so the mutable stores write to a file both
processes can see. `repoRoot()` in `repo-root.ts` walks up from
`process.cwd()` looking for `pnpm-workspace.yaml`, which makes the path
independent of which app started the process; every file store shares it.

**Seeding.** On first read, `.glowroot-orders.json` doesn't exist, so `store.ts`
writes `seedOrders` out — both apps then start from identical data. `zones.ts`
and `partners.ts` do the same from `seedServiceAreas` and `seedPartners`. The
users file seeds to an empty array; the first sign-up or checkout creates it.

**Resetting.** Delete either file. Orders re-seed on next read; users come back
empty. Both files are gitignored.

**Constraint.** `store.ts` and `users.ts` use `fs` and `crypto` — they are Node
runtime only and must never be imported from a client component. Everything
client-facing goes through a server action or an RSC.

---

## 3. The data layer API

Everything in `packages/data/src/index.ts`. All accessors are `async` even when
the current implementation is synchronous, so replacing them with real I/O is
non-breaking.

### Catalogue (read-only)

```ts
getProducts()  getProductBySlug(slug)  getJuices()  getSmoothies()  getShots()
getProduce(group?)  getCombos()  getBundles()  getPlans()
getMaterials()  getLowStockMaterials()
```

### Orders

```ts
getOrders(); // newest first
getOrderById(id); // admin — no identity check
getOrdersByEmail(email); // account area
getOrderForTracking(id, email); // public /track — needs BOTH
addOrder(order);
updateOrderStatus(id, status);
getDashboardStats(); // admin KPI tiles
```

`getOrderForTracking` requires the order ID _and_ the email it was placed with.
An order ID alone is guessable (`GR-1042`), so it isn't treated as a credential.

### Users

```ts
getUserByEmail(email)  -> PublicUser        // passwordHash stripped
isRegisteredUser(email) -> boolean          // has credentials, not just a guest record
createUser({name, email, phone?, password})
verifyUser(email, password)
saveCustomerProfile({name, email, phone?, address?, pincode?})
getCustomerByEmail(email)
```

`toPublic()` strips `passwordHash` before any user record can be returned. The
hash never crosses the server boundary — `User` stays server-side, `PublicUser`
is the only shape a client sees.

### Serviceability

```ts
isServiceable(pincode)                       // live, reads .glowroot-zones.json
getServiceConfig()  getServiceAreas()
earliestDeliveryDate(fromISO, leadDays?)     // pure, browser-safe
earliestDeliveryDateFor(fromISO, pincode)    // honours the area's own lead time
createServiceArea / updateServiceArea / setServiceAreaActive
deleteServiceArea / setNationwideDelivery
deliverySlots  deliveryLeadDays
```

### Delivery partners & dispatch

```ts
getDeliveryPartners()  getDeliveryPartnerById(id)
getPartnerWorkloads()      // roster joined against live orders
getUnassignedOrders()
assignOrderPartner(orderId, partnerId | null)
createPartner / updatePartner / setPartnerStatus / deletePartner
```

---

## 4. Domain model

Defined once in `packages/types` and shared by both apps and the data layer.
Key shapes:

- **`Product`** — slug-keyed, carries a `recipe: RecipeItem[]` (a bill of
  materials referencing `Material.id`). This is what ties a storefront sale to
  admin inventory conceptually.
- **`Material`** — raw produce with `stock` and `reorderLevel`; anything at or
  below its reorder level shows as a low-stock alert.
- **`Order`** — customer, items, type (`one-time` | `subscription`), status,
  total, delivery date/slot, optional `payment`, and an append-only
  `history: OrderEvent[]`.
- **`Payment`** — method (`upi` | `card` | `cod`), status, gateway reference,
  and an `instrumentHint` (masked). The full instrument is never stored.
- **`User`** — email is the primary key, always lowercased. `PublicUser` is the
  same minus `passwordHash`.

There is no join table between orders and users: both key on the normalised
email, which is why `normaliseEmail()` is applied on every path that touches
either store.

---

## 5. Write paths

Four server actions mutate state. Everything else is a read.

### `placeOrder` — `apps/storefront/app/checkout/actions.ts`

The full order pipeline, in this order:

1. **Auth gate** — `isRegisteredUser(email)`. The UI gates `/checkout` too, but a
   server action is a public endpoint, so this is the check that actually holds.
2. **Hard serviceability check** — `isServiceable(pincode)`.
3. **Delivery date required.**
4. **Price** — sum the cart, or for a subscription look up
   `plan.pricing[cycle].priceINR` server-side. Client-supplied totals are never
   trusted for plans.
5. **Charge** — the mock gateway (below).
6. **Persist** — only if the charge succeeded. A decline leaves nothing behind:
   no half-written order to reconcile.
7. **`saveCustomerProfile`** — records name/phone/address/pincode so the next
   checkout prefills, and so a guest still accrues a profile they can claim later.

Order IDs are `GR-` + a random four-digit number. Fine for a prototype;
collision-prone, and a real backend would use a sequence.

Initial status derives from payment: `paid` → `confirmed`, COD → `pending`.

### `signIn` / `signUp` — `apps/storefront/app/login/actions.ts`

See §6.

### `changeStatus` — `apps/admin/app/orders/actions.ts`

Sets the status, appends to `history`, then `revalidatePath` on the order detail,
the orders list and the dashboard so the admin UI reflects it immediately.

### `saveCustomerProfile` — called from checkout

Merge semantics matter here: **only non-empty fields overwrite**. A checkout that
omits a phone number must not wipe the one already on file.

---

## 6. Auth

### What's real

- Passwords are **salted PBKDF2-SHA256**, 120,000 iterations, 32-byte key,
  stored as `"<saltHex>:<digestHex>"`. Plaintext never touches disk.
- Verification uses `timingSafeEqual`, with a length check first (it throws on
  mismatched lengths).
- `verifyUser` returns a _reason_ (`not-found` / `no-password` / `bad-password`)
  so the UI can offer sign-up vs. retry. Note this is deliberately more
  informative than production auth would be — it confirms whether an email is
  registered.

### The guest-to-registered path

This is the piece worth understanding. A checkout by someone with no account
creates a **passwordless user record** (`passwordHash: ""`). Later, signing up
with the same email doesn't create a duplicate — `createUser` sees the existing
record and fills in the credentials via `setUserPassword`. The customer's entire
order history is there the moment they register.

So there are three states for an email:

| State                             | `findUser`  | `passwordHash` | `isRegisteredUser` |
| --------------------------------- | ----------- | -------------- | ------------------ |
| Unknown                           | `undefined` | —              | `false`            |
| Guest (ordered, never registered) | record      | `""`           | `false`            |
| Registered                        | record      | digest         | `true`             |

### The gap: no server session

The session lives in `localStorage` (`glowroot.session`, managed by
`AuthProvider`). The server has no idea who is calling. Every action that takes
an email takes it _from the client_.

Concretely: `placeOrder`'s auth gate proves the email belongs to a registered
account — **not** that the caller is that person. Same for `fetchMyOrders`.
`/track` is less exposed because it also demands the order ID.

This is the single largest hole and the one Phase 4 closes. The fix is contained:
these actions read the email off a server session instead of the argument, and
none of the calling UI changes.

Admin has **no auth at all** — anyone who can reach `:3001` can change order
statuses.

---

## 7. Payments (mocked)

`charge()` in `checkout/actions.ts` stands in for Razorpay/Stripe. It:

- validates the instrument shape (UPI `name@bank` regex; card ≥ 12 digits),
- sleeps ~900ms so the UI's "contacting your bank" state is a real wait, not a
  fake spinner,
- returns a `PAY-XXXXXXXX` reference,
- returns `status: "pending"` for COD (settles at the door) and `"paid"` otherwise,
- honours `simulateFailure` so the decline path is exercisable from the UI.

The `Payment` object it returns is already the shape the order persists, so
replacing the function body with a real gateway call is the whole migration. Only
the masked `instrumentHint` is stored — never the full card or UPI handle.

---

## 8. Serviceability & the delivery map

The hybrid contract from `customer-journey.md`: **soft while browsing, hard at
checkout.** A pincode outside the area shows a banner but never blocks browsing;
`placeOrder` rejects it.

The map itself is operator-owned. `.glowroot-zones.json` holds one
`ServiceArea` per pincode (area, city, lead time, COD, active) plus a
`nationwide` switch, and the admin **Locations** screen is the only thing that
writes it.

**Coverage modes.** `nationwide: true` (the default) accepts any well-formed
6-digit pincode, and the area records add local lead times and COD rules on top.
`nationwide: false` narrows checkout to the active areas. A **paused** area is
refused under either mode — pausing is how operations closes a pincode without
losing its record.

**One rule, two runtimes.** `serviceability.ts` is pure and browser-safe: it
exports `isServiceableWith(pincode, config)`, `findServiceArea`, `leadDaysFor`
and `earliestDeliveryDate`, and it never touches `fs`. The server layout reads
the config once and hands it to `StoreProvider`, so the header control, the soft
banner and the checkout form all answer from the same data the server will
enforce with. `zones.ts` is the file-backed half and is server-only.

Lead time is per area (`leadDays`), so the earliest deliverable date moves with
the pincode — next-day in Mumbai, two days in Kochi. `placeOrder` re-derives it
with `earliestDeliveryDateFor()` rather than trusting the submitted date, and
refuses COD in an area whose record has it switched off. Three morning slots are
offered everywhere.

---

## 8a. Dispatch

`.glowroot-partners.json` holds the delivery roster: name, phone, vehicle, the
pincodes they cover (`zones`), `capacityPerSlot`, and a status of
`available` / `on-route` / `off-duty` / `inactive`.

An order carries `deliveryPincode` and an optional `partnerId`. Assignment is
deliberately **not** part of the status ladder — an order can be assigned while
it is still pressing, and reassigned if a partner drops out — so it lives in
`setOrderPartner()` rather than in the transition graph.

Guard rails, all enforced server-side:

- An `inactive` partner cannot be assigned (`assignOrderPartner` refuses).
- A partner carrying live orders cannot be deactivated or deleted until those
  orders are reassigned.
- Assignment requires `fulfilment.manage`; the Locations screen requires
  `settings.manage`. Both write `admin_audit_logs`.

`getPartnerWorkloads()` joins the roster against the order store in one pass —
the admin Delivery board, the order detail assigner and the dashboard tile all
read it. The customer sees the assigned partner's name on their tracking page,
and the phone number only while the order is `out-for-delivery`.

---

## 9. Order lifecycle

```
pending ──▶ confirmed ──▶ pressing ──▶ out-for-delivery ──▶ delivered
   └──────────────── cancelled ◀────────────────┘
```

Transitions are unconstrained — the admin `StatusChanger` can set any status
from any status. A real backend would enforce the graph.

Each transition appends `{status, at}` to `order.history`, which is what the
customer-facing `OrderTimeline` renders. Seed orders predate tracking and have
no `history`; `setOrderStatus` starts one from whatever status they move to,
so the timeline doesn't break on them.

---

## 10. Gaps (Phase 4)

Ordered roughly by how much they matter:

1. **Server sessions.** Signed HTTP-only cookie. Actions read identity from the
   session, not from client-supplied email. Closes the impersonation hole in
   `placeOrder` and `fetchMyOrders`.
2. **Admin auth.** Currently none.
3. **Real database.** Postgres + Prisma behind the same accessor signatures.
   The JSON stores have no locking — two concurrent writes to
   `.glowroot-orders.json` will lose one (read-modify-write, no atomic rename).
4. **Real payment gateway.** Swap `charge()`'s body; the `Payment` shape stays.
5. **Inventory deduction.** `Product.recipe` exists and is displayed, but nothing
   decrements `Material.stock` when an order is placed. Low-stock alerts are
   driven purely by the seed values.
6. **Rate limiting** on sign-in, and a password reset flow (there is none).
7. **Order ID generation** — sequence instead of `Math.random()`.
8. **Status transition rules** — enforce the lifecycle graph server-side.
9. **Catalogue writes.** Admin products and materials pages are read-only views;
   there is no create/edit path. (Locations and Delivery partners _are_
   writable — they were the first admin screens to get one.)
10. **Slot capacity is advisory.** A partner's `capacityPerSlot` is shown next to
    their load on the dispatch board, but nothing refuses an over-capacity
    assignment, and delivery slots have no capacity of their own.

---

## 11. Working on it

```bash
pnpm dev                      # both apps
pnpm --filter storefront dev  # storefront only
pnpm typecheck
```

- Adding a data operation? Add the accessor to `packages/data/src/index.ts`
  first, async, returning a type from `@glowroot/types`. Apps import the
  accessor, never the raw array.
- Adding a mutation? It belongs in a `"use server"` action, and it must
  re-validate its inputs — the UI gate is a convenience, the action is the
  boundary.
- Touching `store.ts` or `users.ts`? Node runtime only. Never import from a
  client component.
- Reset state by deleting `.glowroot-orders.json` / `.glowroot-users.json`.
