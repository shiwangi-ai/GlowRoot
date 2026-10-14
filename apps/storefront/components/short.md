The proof is right there in the data: your seed orders are GR-1037 through GR-1042, but the file now has 6 extra ones (GR-7005, GR-6202, GR-7092, GR-5011, GR-2988, GR-9181) — those are real orders placed through checkout (note the random 4-digit IDs). Here's how the whole thing works without any microservices.

The short answer

There is no backend service, no database, and no network API between the two apps. The "shared backend" is literally a single JSON file on disk — .glowroot-orders.json at your repo root — that both Next.js apps read and write through the same shared library (@glowroot/data). Next.js Server Actions do the writing, so no REST endpoint or message queue is ever involved.

The flow, step by step

1. Customer places an order (storefront, port 3000)

The checkout page calls a server action — placeOrder() in apps/storefront/app/checkout/actions.ts. The "use server" directive means this function runs on the storefront's own Node server, not in the browser. It:

- validates serviceability + delivery date,
- computes the total,
- generates an ID with GR-${Math.floor(1000 + Math.random()*9000)} (that's why your new orders are GR-7005, GR-9181, etc.),
- calls addOrder(order).

2. addOrder writes to the shared file

addOrder → appendOrder() in packages/data/src/store.ts. This module uses Node's fs to:

- find the repo root by walking up until it sees pnpm-workspace.yaml,
- read .glowroot-orders.json, unshift the new order onto the front, and write the file back.

3. Admin reads the same file (admin, port 3001)

The admin orders page calls getOrders() → readOrders() → reads that exact same .glowroot-orders.json. Because the store deliberately resolves the path to the workspace root, both Next.js processes point at one file:

Storefront (:3000) ──addOrder()──┐
▼
.glowroot-orders.json ← the "shared data layer"
▲
Admin (:3001) ──getOrders()──┘

4. Status changes flow back the same way

In admin, changeStatus() (apps/admin/app/orders/actions.ts) is another server action → updateOrderStatus() → rewrites the file, then revalidatePath() refreshes the cached admin pages.

Why this works without microservices

Three things make it possible:

- A monorepo with a shared package. Both apps import from @glowroot/data. They're not talking to each other over a network — they're running the same code against the same file. The package boundary gives you the illusion of a service (clean getOrders() / addOrder() accessors) without one existing.
- Server Actions replace an API layer. Next.js lets a function run server-side when called from a component. That removes the need for you to build /api/orders endpoints — the RPC is generated for you.
- The filesystem is the shared state. Two separate processes can't share in-memory arrays, but they can share a file. That single JSON file is your whole "database."

The catch (worth knowing)

This works only because both apps run on the same machine sharing one disk. The store's own comments call it "a thin, swappable seam": readOrders/appendOrder/setOrderStatus have the same async signatures a real DB or service would have, so when you move to Phase 4 you swap only store.ts's body for real DB calls — the two apps and the types don't change. It's essentially a shared-database pattern (the simplest step above a monolith), just with a JSON file standing in for the database.

One honest limitation: file writes here aren't concurrency-safe — two simultaneous checkouts could race on read-modify-write. Fine for a demo, and exactly the kind of thing the DB swap fixes later.
