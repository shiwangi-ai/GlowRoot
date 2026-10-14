# Customer storage and admin access

Customers, orders and storefront sessions now use the existing PostgreSQL
connection through `@glowroot/db`. There is no JSON fallback for these records.
The product catalogue, shops, delivery partners and service zones still use
their existing stores; this change does not migrate those modules.

## Access

The Customers list (`/customers`) and profile pages (`/customers/[id]`) require
an authenticated, active staff account with the `customers.view` permission and
one of the roles `owner`, `super-admin` or `admin`. The existing `owner` role is
displayed as **Super Admin**. Admin has operational permissions, but cannot
manage staff roles or security. No existing staff member is assigned a new role.

Other staff cannot view customer names, contact information or addresses on
the dashboard, Orders or Delivery pages. Server rendering removes those fields
before they reach the browser, including client component props. Customer
password hashes and session tokens are never selected by customer admin pages.
The customer storefront retains its existing own-account and order-tracking
flows. Customer editing, notes, exports and deletion are not added in this phase.

The Staff & access screen remains the existing UI prototype; its role badges
are not an access-control authority. The database roles and server checks are.

## Database setup and import

Use the same `DATABASE_URL` in `packages/db/.env`, `apps/admin/.env.local` and
`apps/storefront/.env.local`.

Stop checkout/account writes in the old app before importing. Apply the
migration and import before starting the updated app:

```sh
pnpm install
pnpm --filter @glowroot/db generate
pnpm --filter @glowroot/db deploy
pnpm --filter @glowroot/db import:customers
```

The import reads `.glowroot-users.json`, `.glowroot-orders.json` and
`.glowroot-sessions.json` from the repository root. It runs in one transaction,
normalizes customer emails, retains existing password hashes, links orders to
stable customer UUIDs, and preserves valid active sessions. Order-only customers
receive a guest profile. Expired sessions and sessions without registered
accounts are skipped. Missing source files count as empty; malformed files fail
the import. No demonstration orders are inserted if the order file is missing.

Re-running the import does not overwrite existing database records. Keep the
original files as a rollback snapshot until the migration is accepted; the new
app neither updates nor reads them. Rolling back to the old app requires
exporting any new database writes first, because these snapshots become stale.

Order contact details remain a checkout snapshot independent of the current
customer profile. Profile and order creation are committed together. PostgreSQL
row locks make order status changes, cancellation, reassignment and rescheduling
atomic across the admin and storefront processes.

## Verification

```sh
pnpm typecheck
pnpm build
node scripts/test-customer-database.cjs
node scripts/test-order-cancellation.cjs
node scripts/test-order-rescheduling.cjs
```

Database tests require the migrated local database and permission to create
temporary schemas. They create `customer_test_*` schemas, use synthetic data,
and drop their own schemas on completion; they do not edit application rows.
