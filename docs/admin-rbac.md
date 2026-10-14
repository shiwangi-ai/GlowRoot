# GlowRoot — admin roles & permissions

> Current customer-access policy: customer profiles, contact details and delivery
> addresses are restricted to Super Admin (legacy `owner`) and `admin`. The
> customer and delivery-contact grants for other roles in the original matrix
> below are deferred. See [customer storage and access](customer-database.md).

Reference for the admin RBAC layer. **The executable source of truth is
[`packages/db/prisma/seed.mts`](../packages/db/prisma/seed.mts)** — this document
describes what that seed encodes. The matrix below was generated from the live
database after seeding, so it reflects grants as they actually exist.

Supersedes the environment-variable admin login in `apps/admin/lib/auth.ts`,
which is temporary scaffolding for a single shared operator.

## Principles

- **Denied by default.** A role holds exactly the keys listed for it; absence is
  denial. There is no implicit inheritance between roles.
- **Additive.** A user may hold several roles; effective permission is the union.
- **Enforced on the server.** Hiding a nav item is not authorization. Every
  admin page and server action must check a key.
- **No "limited" special cases.** Every partial cell in the design became its
  own permission key, so module code never branches on role name.
- **Nobody sets another person's password.** Staff arrive by invitation and
  choose their own; an Owner can only send a reset link.

## Roles

| Role key             | Name               | MFA      | Keys     |
| -------------------- | ------------------ | -------- | -------- |
| `owner`              | Owner              | required | 47 (all) |
| `operations-manager` | Operations Manager | required | 29       |
| `fulfilment-agent`   | Fulfilment Agent   | —        | 12       |
| `inventory-manager`  | Inventory Manager  | —        | 9        |
| `catalogue-manager`  | Catalogue Manager  | —        | 11       |
| `customer-support`   | Customer Support   | —        | 16       |
| `finance-manager`    | Finance Manager    | required | 14       |
| `auditor`            | Auditor            | —        | 11       |

MFA is required for the three roles that can move money or grant access:
Owner (`staff.*`), Finance Manager and Operations Manager
(`payments.refund_approve`). `AdminRole.requiresMfa` drives this, so the rule is
data, not a hardcoded role check.

## Matrix

Cells show _granted / total_ keys in that module.

| Module                                                                    | Own   | Ops   | Ful  | Inv  | Cat  | Sup  | Fin  | Aud  |
| ------------------------------------------------------------------------- | ----- | ----- | ---- | ---- | ---- | ---- | ---- | ---- |
| `dashboard`                                                               | 1/1   | 1/1   | 1/1  | 1/1  | 1/1  | 1/1  | 1/1  | 1/1  |
| `orders`                                                                  | 10/10 | 10/10 | 5/10 | 1/10 | 1/10 | 4/10 | 1/10 | 1/10 |
| `customers`                                                               | 6/6   | 1/6   | 1/6  | —    | —    | 3/6  | 1/6  | 1/6  |
| `catalogue`                                                               | 6/6   | 1/6   | 1/6  | 1/6  | 6/6  | 1/6  | 1/6  | 1/6  |
| `inventory`                                                               | 4/4   | 4/4   | 1/4  | 4/4  | 1/4  | —    | 1/4  | 1/4  |
| `fulfilment`                                                              | 2/2   | 2/2   | 2/2  | 1/2  | —    | 1/2  | —    | 1/2  |
| `subscriptions`                                                           | 4/4   | 4/4   | 1/4  | —    | 1/4  | 4/4  | 1/4  | 1/4  |
| `payments`                                                                | 4/4   | 2/4   | —    | —    | —    | 2/4  | 4/4  | 1/4  |
| `reports`                                                                 | 2/2   | 1/2   | —    | 1/2  | 1/2  | —    | 2/2  | 1/2  |
| `staff`                                                                   | 5/5   | —     | —    | —    | —    | —    | —    | —    |
| `settings`                                                                | 2/2   | 1/2   | —    | —    | —    | —    | 1/2  | 1/2  |
| `audit`                                                                   | 1/1   | 1/1   | —    | —    | —    | —    | 1/1  | 1/1  |
| Own = Owner, Ops = Operations Manager, Ful = Fulfilment Agent,            |
| Inv = Inventory Manager, Cat = Catalogue Manager, Sup = Customer Support, |
| Fin = Finance Manager, Aud = Auditor.                                     |

## Permission keys

47 keys across 12 modules, named `module.action` with a unique constraint on
`(module, action)`.

| Module          | Actions                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard`     | `view`                                                                                                                                                          |
| `orders`        | `view`, `view_delivery_details`, `update_status`, `mark_pressing`, `mark_out_for_delivery`, `mark_delivered`, `cancel`, `edit_delivery`, `edit_total`, `export` |
| `customers`     | `view`, `view_delivery_contact`, `edit`, `add_note`, `export`, `delete`                                                                                         |
| `catalogue`     | `view`, `create`, `edit`, `publish`, `delete`, `change_price`                                                                                                   |
| `inventory`     | `view`, `adjust`, `receive`, `record_wastage`                                                                                                                   |
| `fulfilment`    | `view`, `manage`                                                                                                                                                |
| `subscriptions` | `view`, `manage`, `pause`, `cancel`                                                                                                                             |
| `payments`      | `view`, `refund_request`, `refund_approve`, `export`                                                                                                            |
| `reports`       | `view`, `export`                                                                                                                                                |
| `staff`         | `view`, `invite`, `edit_roles`, `disable`, `reset_mfa`                                                                                                          |
| `settings`      | `view`, `manage`                                                                                                                                                |
| `audit`         | `view`                                                                                                                                                          |

Three separations worth preserving:

- **`refund_request` vs `refund_approve`.** Support can raise; Operations and
  Finance can approve. Owner holds both, so a one-person shop still works.
- **`customers.view` vs `customers.view_delivery_contact`.** A fulfilment agent
  sees the name and phone for a drop, not the account or its history.
- **Exports are their own keys** (`customers.export`, `payments.export`,
  `orders.export`, `reports.export`) and must be audited.

## Invariants

Implemented in layer 3 (`apps/admin/lib/`):

- Reset tokens are single-use, expire in 30 minutes, and requesting one returns
  an identical response whether or not the account exists.
- Changing a password revokes every session and emails the account owner.
- A suspended or disabled account loses access on its next request —
  `readAdminSession` rejects any status other than `ACTIVE`.
- Sign-in locks an account for 15 minutes after 5 failed attempts, and spends
  the same work on unknown addresses so timing does not leak membership.
- Login, lockout, invitation, acceptance, reset, and order status changes all
  write `admin_audit_logs` rows.
- `canGrantAll()` exists so staff cannot grant a permission they do not hold.

Screens behind these keys today:

- `settings.view` / `settings.manage` → **Locations**, the delivery map. View is
  read-only; manage is required to add, edit, pause or remove an area and to
  switch coverage mode. Owners and Operations Managers can manage it; finance
  and audit roles retain read-only visibility.
- `fulfilment.view` / `fulfilment.manage` → **Delivery partners**, the roster and
  dispatch board. Manage also gates assigning a partner to an order, on that
  screen and on the order detail view.

Still to do, in the layers above:

- An administrator cannot remove the last active Owner (needs the staff
  management screens in layer 4).
- MFA enrolment. The schema, the `requires_mfa` flag, and the "outstanding"
  banner exist, but there is no TOTP enrolment or challenge yet, so a role
  marked `requires_mfa` is currently advisory.
- Exports are not built, so `*.export` keys are not yet checked anywhere.

## Divergences from the original design

1. **Eight roles, not the recommended six.** The `/staff` UI already presents
   eight; a DB/UI mismatch costs more than the effort saved by deferring
   Catalogue Manager and Auditor.
2. **MFA storage was missing entirely** and was added here:
   `admin_mfa_credentials` (one encrypted TOTP secret per user),
   `admin_mfa_recovery_codes` (hashed, single-use),
   `admin_users.mfa_enrolled_at`, and `admin_roles.requires_mfa`.
3. **`admin_invitation_roles`** carries an invitation's roles relationally, so an
   invite states the roles it will grant on acceptance.

## Running it

```bash
pnpm --filter @glowroot/db exec prisma migrate deploy   # apply migrations
pnpm --filter @glowroot/db seed                         # idempotent; re-run after edits
```

Editing the matrix in `seed.mts` and re-running revokes removed keys — the seed
replaces each role's grant set rather than adding to it.

Set `ADMIN_BOOTSTRAP_EMAIL` (and optionally `ADMIN_BOOTSTRAP_NAME`) to create the
first Owner. It is created `INVITED` with no password.
