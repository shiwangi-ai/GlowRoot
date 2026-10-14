# GlowRoot production-readiness review

Reviewed 2026-08-18. This document separates code hardening completed in the
prototype from the systems that are still required before a public launch.

## Current verdict

The storefront and admin applications build successfully and the most direct
authorization and checkout-tampering issues have been closed. The product is
still **not ready for a public production launch** because persistence,
payments, operational controls, and automated test coverage are prototypes or
absent. Treat the current build as a hardened staging release.

## Improvements completed in this review

- Upgraded both apps from Next.js 14.2.35 to 15.5.21 and migrated async request
  APIs/page props.
- Added a non-interactive ESLint configuration and fixed the conditional-hooks
  defect it found.
- Closed the order-confirmation IDOR: confirmation details now resolve against
  the signed-in customer's server session.
- Repriced every one-time cart line from server-owned product/combo/bundle data;
  client prices, bundle names, and box contents are no longer trusted.
- Added server-side quantity/order-size, customer-field, payment-method,
  delivery-date, delivery-slot, and serviceability validation.
- Replaced guessable random four-digit order IDs and payment references with
  high-entropy identifiers.
- Re-enabled the real serviceable-pincode allow-list.
- Enforced the order lifecycle on the server and limited the admin UI to legal
  next states.
- Added a dedicated admin login/logout flow with an HTTP-only, signed,
  eight-hour staff session; middleware and mutation-level authorization fail
  closed, and deployment credential examples are included.
- Added baseline browser security headers and removed the framework disclosure
  header.
- Raised the deployment runtime floor to Node.js 22.

## Release blockers — important areas not started

### 1. Durable database and transactions

Orders, users, and sessions still live in JSON files. There is no locking,
transaction boundary, replication, backup/restore procedure, migration system,
or multi-instance support. Concurrent writes can be lost. Move these stores to
Postgres (or equivalent), add schema migrations, unique constraints, and an
atomic order/payment/inventory transaction.

### 2. Real payments and subscription billing

The payment provider is a simulator. There are no provider tokens, webhooks,
idempotency keys, reconciliation, refunds, chargebacks, recurring mandates,
invoices, or failure recovery. Do not accept card details in the current UI in
production; use a provider-hosted/PCI-compliant payment surface.

### 3. Inventory and fulfilment operations

Product recipes exist, but checkout does not reserve or decrement inventory.
There is no slot capacity, cutoff time, stockout handling, procurement workflow,
wastage tracking, or third-party fulfilment integration.

_Partly addressed since this review:_ the delivery map (service areas, coverage
mode, per-area lead time and COD) and the delivery-partner roster are now
operator-managed in the admin, orders record their delivery pincode, and
dispatch can assign a partner to an order. A partner's per-slot capacity is
displayed but not enforced, and the two stores are JSON files, so blocker 1
still applies to them.

### 4. Automated tests and CI/CD

There are no unit, integration, end-to-end, accessibility, visual regression,
load, or security tests, and no checked-in CI/deployment pipeline. At minimum,
automate lint, typecheck, build, dependency audit, checkout/auth/order isolation,
admin authorization, and rollback-safe deployment.

### 5. Account lifecycle and abuse controls

Password reset, email verification, session/device management UI, credential
rotation, login/signup/tracking rate limits, bot protection, and account
deletion/export are absent. Error messages currently permit account discovery.

### 6. Production-grade staff access

The current environment-backed staff login is an interim single-operator gate.
Individual staff identities, role-based access, MFA, audit logs, SSO, persistent
session revocation, and login rate limiting are not started.

### 7. Observability and operations

There is no structured logging, error tracking, metrics, tracing, uptime check,
alerting, runbook, on-call process, health/readiness endpoint, or disaster
recovery exercise.

### 8. Customer communications and compliance

Order receipts, delivery notifications, subscription reminders, support flows,
privacy/terms/refund policies, consent/cookie handling, retention rules, tax
invoices, and jurisdiction-specific food/e-commerce compliance are absent.

### 9. Dependency remediation still requiring installation approval

After the Next.js upgrade, `pnpm audit --prod` dropped from 26 findings to five,
but still reports three high and two moderate transitive findings in
`sharp@0.34.5` and `postcss@8.4.31`. Patched versions are `sharp >=0.35.0` and
`postcss >=8.5.23`. The install needed to pin those transitive versions was not
approved during this review, so this remains a release blocker.

## Deployment requirements for the current staging build

- Use Node.js 22+ and pnpm 9.15.9.
- Set `ADMIN_USERNAME`, a long random `ADMIN_PASSWORD`, and an independent
  `ADMIN_SESSION_SECRET` of at least 32 random characters for the admin app.
  Protected requests fail closed when any value is missing.
- Serve both origins over HTTPS. Restrict the admin origin at the network layer
  in addition to application authentication.
- Use persistent single-instance storage only for staging; JSON storage is not
  safe for horizontally scaled or public production use.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm audit --prod` in CI.
