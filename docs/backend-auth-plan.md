# GlowRoot — Backend & Auth Plan

> Saved from a working session, 2026-08-01.
>
> **The question:** understand the frontend, then suggest how to manage the backend to
> handle future _and_ present data — and how login/auth should work.
>
> Sibling documents: [`backend.md`](./backend.md) describes what exists today;
> [`frontend.md`](./frontend.md) is the original build plan;
> [`customer-journey.md`](./customer-journey.md) / [`user-journey.md`](./user-journey.md)
> are the UX contract. This document is the **recommendation**, not the code.

---

## What the frontend actually is

Two Next 14.2 App Router apps over four shared packages. Three seams matter for
backend work:

1. **`@glowroot/data` accessors** (`packages/data/src/index.ts`) — every accessor is
   already `async` and returns `@glowroot/types` shapes. Apps never touch raw arrays.
   This is the API contract and it's genuinely well built.
2. **Server actions** — the only mutation entry points: `placeOrder`, `signIn`/`signUp`,
   `changeStatus`. Reads mostly happen in RSCs.
3. **Client state** — `StoreProvider` (cart + pincode) and `AuthProvider` (session) both
   live in `localStorage`. Cart there is fine. Session there is not.

The frontend is _ahead_ of the backend in one useful way: `OrderItem` already snapshots
`priceINR`, `Payment` already stores only `instrumentHint`, and `Order.history` is
already append-only. Those are production-shaped decisions.

`docs/backend.md` is accurate and current. `docs/user-journey.md` is **stale** — it still
describes email-matched login from before real PBKDF2 landed.

---

## What will bite you, in order

| Problem                                              | Where                                                                                      | Why it matters for future data                                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email is the primary key**                         | `packages/types/src/index.ts:213`, `getOrdersByEmail`                                      | No `User.id`. Change an email and the order history detaches. Every future FK has nothing to point at.                                                                                         |
| **Subscriptions aren't entities**                    | `placeOrder` writes an `Order` with `planSlug` and `items: []` (`checkout/actions.ts:153`) | A subscription is recurring; nothing generates the second delivery. This is the biggest missing table.                                                                                         |
| **Read-modify-write JSON, no locking**               | `store.ts:71`, `users.ts:52`                                                               | Two concurrent checkouts lose one. No atomic rename either — a crash mid-write truncates the file.                                                                                             |
| **Order IDs are `Math.random()` 4-digit**            | `checkout/actions.ts:166`                                                                  | 9000-value space, no uniqueness check on insert. Collisions are a matter of when.                                                                                                              |
| **No payment idempotency**                           | `placeOrder`                                                                               | Double-submit = two charges + two orders. The `submitting` flag is client-side only.                                                                                                           |
| **Stock is a mutable number nobody decrements**      | `Material.stock`, `recipe` unused                                                          | `recipe` exists and is displayed but inventory never moves.                                                                                                                                    |
| **`@glowroot/data` root export drags `fs`/`crypto`** | `index.ts` re-exports catalogue _and_ file stores                                          | Works today only because client components use the `/serviceability` subpath. One careless root import from a client component breaks the build — and it gets worse with a DB client in there. |
| **`readOrdersSync`**                                 | `store.ts:67`                                                                              | Sync fs read in a request path. Delete it when you migrate.                                                                                                                                    |

---

## Backend: don't build a separate service

Keep everything inside the monorepo. Add `packages/db` (Prisma + Postgres), and **swap
the bodies of the existing `@glowroot/data` accessors**. No app code changes — that's the
whole payoff of the seam already built. A standalone Express/Nest API only earns its keep
when there's a non-Next consumer (mobile app), and even then Next route handlers cover
gateway webhooks fine.

Two structural changes to `packages/data` while you're in there:

- **Split the export surface**: `@glowroot/data/catalog` (pure, client-safe) vs
  `@glowroot/data/server` (DB + crypto). Add `import "server-only"` at the top of the
  server modules so misuse fails at build time instead of at runtime.
- **Keep the accessor signatures**, but drop `email` params in favour of session-derived
  identity (see the auth section).

### Schema sketch

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique          // still normalised lowercase
  name         String
  phone        String?
  passwordHash String?                   // null = guest record (replaces "" sentinel)
  addresses    Address[]
  orders       Order[]
  sessions     Session[]
  createdAt    DateTime @default(now())
}

model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique             // sha256 of the cookie value, never the raw token
  userId    String
  role      Role     @default(CUSTOMER)
  expiresAt DateTime
  createdAt DateTime @default(now())
  userAgent String?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Order {
  id             String   @id            // "GR-1042" from a real sequence
  orderNumber    Int      @unique @default(autoincrement())
  userId         String?                 // nullable → guest orders still work
  customerSnap   Json                    // name/email/phone/address AT ORDER TIME
  requestId      String   @unique        // idempotency key from the client
  subscriptionId String?
  items          OrderItem[]             // priceINR snapshotted per line
  events         OrderEvent[]
  payment        Payment?
  status         OrderStatus
  totalINR       Int
}

model Subscription {
  id               String   @id @default(cuid())
  userId           String
  planSlug         String
  cycle            BillingCycle
  status           SubStatus            // active | paused | cancelled
  nextDeliveryDate DateTime
  orders           Order[]              // the deliveries it generated
}

model InventoryMovement {
  id         String   @id @default(cuid())
  materialId String
  deltaGrams Int                        // negative = consumed by an order
  reason     MovementReason             // ORDER | RESTOCK | WASTAGE | CORRECTION
  orderId    String?
  createdAt  DateTime @default(now())
}
```

Three ideas in that sketch worth calling out:

- **Catalogue is mutable, transactions are immutable.** Products/prices live in the DB and
  change; the order keeps its own snapshot of price and customer. This already happens for
  price — extend it to the customer.
- **Stock becomes derived, not stored.** `Material.stock` turns into a cached sum over
  `InventoryMovement`. An append-only ledger is auditable and idempotency-friendly; a
  mutable counter is neither.
- **`requestId` unique index** is the entire double-charge fix: `CheckoutClient` generates
  a UUID once per checkout attempt, `placeOrder` inserts under it, a retry hits the
  constraint and returns the existing order.

### Migrating present data

Nothing needs to be lost:

- **Catalogue** → a `seed.ts` that imports the existing `products` / `materials` /
  `combos` / `plans` arrays and inserts them. The TS modules become the seed source, not
  dead code.
- **`.glowroot-orders.json`** → a one-shot script; `customer` becomes `customerSnap`,
  `history` becomes `OrderEvent` rows, `payment` becomes a `Payment` row. Backfill
  `userId` by matching normalised email.
- **`.glowroot-users.json`** → direct insert. The `"<saltHex>:<digestHex>"` PBKDF2 format
  is portable — copy `verifyPassword` as-is and nobody resets a password. Convert
  `passwordHash: ""` to `null`.

Wrap order placement in one transaction: insert order + payment + inventory movements, or
none of it. Right now `addOrder` and `saveCustomerProfile` are two separate writes that
can half-fail.

---

## Auth: how login should actually work

The password half is already real (PBKDF2-SHA256, 120k iterations, `timingSafeEqual`). The
missing half is that **the server has no idea who is calling** — `placeOrder` proves the
email belongs to a registered account, not that you're that person. Anyone can POST that
action with someone else's email. Same for `fetchMyOrders`.

Fix it with server sessions, not a library. ~150 lines, and it's the highest-value thing
to learn here. Auth.js/Clerk only becomes worth it when you want OAuth or magic links.

### Session mechanics — opaque token, not JWT

Generate 32 random bytes, send the hex as the cookie, store only its SHA-256 in
`Session.tokenHash`. Opaque + DB-backed means logout actually revokes, you get "sign out
everywhere" free, and there's no key-rotation problem. JWTs buy statelessness you don't
need.

```ts
// packages/auth/src/session.ts   — "server-only"
export async function createSession(
  userId: string,
  role: Role,
): Promise<string>;
export async function readSession(token: string): Promise<SessionUser | null>;
export async function destroySession(token: string): Promise<void>;

// apps/storefront/lib/auth.ts    — the Next-specific cookie layer
export async function getCurrentUser(): Promise<SessionUser | null>;
export async function requireCustomer(): Promise<SessionUser>; // throws → UI redirects
```

Cookie: `gr_session`, `httpOnly`, `sameSite: "lax"`, `secure` in production, `path: "/"`,
30-day rolling expiry refreshed on use. In Next 14.2 `cookies()` is synchronous and you
can only `.set()` from a server action or route handler — so `signIn` / `signUp` /
`signOut` all become the cookie-writing boundary. Server Actions already do an
Origin/Host check, so cookie sessions don't need separate CSRF tokens.

> ⚠️ **Gotcha for this setup: cookies ignore port.** `localhost:3000` and `localhost:3001`
> share one cookie jar, so storefront and admin sessions will collide in dev. Use distinct
> cookie names (`gr_session` / `gr_admin`) _and_ validate the session's role on read —
> don't trust the cookie name alone.

### The action changes, which are small

| Action                    | Today                         | After                                             |
| ------------------------- | ----------------------------- | ------------------------------------------------- |
| `placeOrder`              | trusts `input.customer.email` | drops email from input, reads `requireCustomer()` |
| `fetchMyOrders(email)`    | trusts arg                    | `fetchMyOrders()`                                 |
| `fetchMyOrder(id, email)` | trusts arg                    | `fetchMyOrder(id)`                                |
| `trackOrder(id, email)`   | id + email                    | **unchanged** — this is the correct guest path    |
| `changeStatus`            | no auth at all                | `requireStaff()` + audit row                      |

### The frontend change is mostly deletion

`AuthProvider` stops owning the session: the server reads it and passes `initialCustomer`
down, so `localStorage` and the `hydrated` flag both go away — along with the flash-guard
logic in `SiteHeader`, `AccountOrders`, `AccountOrderDetail`, and `CheckoutClient`. Keep
`StoreProvider`'s `localStorage` for the cart; that's correct where it is.

One honest cost: reading `cookies()` anywhere in the root layout tree opts every route out
of static generation. For a store with a cart and a checkout, just accept dynamic
rendering. If the marketing pages need to be static later, make the header's account chip
a client island that fetches `/api/me` instead.

### Middleware

Add a `middleware.ts` for coarse gating (`/account/*`, `/checkout` → `/login?next=…`;
admin: everything except `/login`). Treat it as UX only — the per-action check is the real
boundary, since middleware can't be trusted for authorization decisions in Next.

### Also worth doing, in rough priority

- **Rate-limit `signIn`** per email _and_ per IP. In-memory sliding window is fine to
  start; note it won't hold across instances.
- **Password reset** — single-use expiring token table. Needs email (Resend, or log the
  link in dev). Right now there's literally no recovery path.
- **Admin identity** — a `Staff` model with roles, not a shared password. `changeStatus`
  should record who did it.

### Two decisions to make explicitly

The code currently contradicts itself on both:

1. **Guest checkout.** `AuthForm` offers "Continue as guest" and `upsertUserProfile`
   creates guest records, but `placeOrder:129` rejects unregistered emails. Pick one.
   **Recommendation: allow real guest checkout** (nullable `Order.userId`, claim-by-email
   on signup — the machinery already exists and it's better for conversion).
2. **Email enumeration.** `verifyUser` returns `not-found` / `no-password` /
   `bad-password`, which confirms whether an email is registered. The UX value is real;
   for a consumer juice shop, **keep it** and write down that enumeration is an accepted
   trade-off, backed by rate limiting.

---

## Sequencing

1. **Server sessions + role-gated admin** — no DB needed, works against the JSON stores.
   Closes the impersonation hole, which is the only _security_ bug here. (~1 day)
2. **Split `@glowroot/data` exports + `server-only`** — cheap, and a prerequisite for a DB
   client living in that package. (~1 hour)
3. **Postgres + Prisma behind the same accessors** + seed/migration scripts. Delete
   `readOrdersSync`. (~2–3 days)
4. **Idempotency key, order sequence, single transaction** — falls out naturally once
   you're on a DB. (~half day)
5. **Subscription entity + inventory ledger** — the two genuinely new domain models.
   (~2 days)
6. **Real gateway, password reset, rate limiting** — independent of each other, do as
   needed.

Steps 1–2 are worth doing before step 3: sessions change the accessor _signatures_, and
you'd rather change them once against JSON than twice against Postgres.
