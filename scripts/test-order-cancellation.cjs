// Cancellation regressions use an isolated PostgreSQL schema, never the workspace orders.
const assert = require("node:assert/strict");
const { setup, load, appRequire } = require("./customer-db-test-support.cjs");
let fixtureDb;
const customerEmail = "customer@example.com";
function order(id, status = "pending") {
  return {
    id,
    status,
    customer: {
      name: "Test Customer",
      email: customerEmail,
      address: "Test address",
    },
    items: [],
    type: "one-time",
    totalINR: 100,
    createdAt: "2026-09-23T00:00:00.000Z",
    deliveryDate: "2026-09-24T00:00:00.000Z",
    payment: {
      method: "cod",
      status: "pending",
      reference: "TEST",
      amountINR: 100,
    },
    history: [{ status: "pending", at: "2026-09-23T00:00:00.000Z" }],
  };
}

(async () => {
  fixtureDb = await setup();
  const storefront = fixtureDb.store;
  const admin = fixtureDb.admin;
  const pending = order("GR-PENDING");
  const paid = {
    ...order("GR-PAID", "confirmed"),
    partnerId: "TEST-PARTNER",
    payment: {
      method: "card",
      status: "paid",
      reference: "MOCK",
      amountINR: 100,
    },
  };
  for (const item of [
    pending,
    paid,
    ...["pressing", "out-for-delivery", "delivered"].map((status) =>
      order(status, status),
    ),
  ])
    await storefront.appendOrder(item);
  const before = await fixtureDb.snapshot();
  for (const args of [
    [pending.id, "wrong@example.com", ""],
    ["missing", customerEmail, ""],
    [pending.id, "", ""],
    [pending.id, customerEmail, "x".repeat(501)],
    [null, customerEmail, ""],
    [pending.id, customerEmail, {}],
  ]) {
    const result = await storefront.cancelOrderForCustomer(...args);
    assert.equal(result.ok, false);
    assert.equal(
      result.order,
      undefined,
      "Unauthorized requests must not disclose an order",
    );
  }
  assert.equal(await fixtureDb.snapshot(), before);
  for (const status of ["pressing", "out-for-delivery", "delivered"]) {
    const result = await storefront.cancelOrderForCustomer(
      status,
      customerEmail,
    );
    assert.equal(result.ok, false);
    assert.equal(
      result.order.status,
      status,
      "Return current state for stale customer views",
    );
  }
  const result = await storefront.cancelOrderForCustomer(
    " gr-pending ",
    " CUSTOMER@example.com ",
    " Changed\n plans ",
  );
  assert.equal(result.ok, true);
  assert.equal(result.order.status, "cancelled");
  assert.equal(
    result.order.history.at(-1).note,
    "Cancelled by customer: Changed plans",
  );
  const again = await storefront.cancelOrderForCustomer(
    pending.id,
    customerEmail,
    "Another reason",
  );
  assert.deepEqual(again.order.history, result.order.history);
  const paidResult = await storefront.cancelOrderForCustomer(
    paid.id,
    customerEmail,
  );
  assert.equal(paidResult.ok, true);
  assert.equal(paidResult.order.partnerId, undefined);
  assert.deepEqual(
    paidResult.order.payment,
    paid.payment,
    "Cancellation must never pretend to refund a payment",
  );
  await assert.rejects(admin.setOrderPartner(paid.id, "OTHER-PARTNER"));

  // Independent module instances model admin and storefront processes sharing PostgreSQL.
  await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      (i % 2 ? admin : storefront).appendOrder(
        order(`GR-CONCURRENT-${i}`, "confirmed"),
      ),
    ),
  );
  assert.equal((await storefront.readOrders()).length, 17);
  for (let i = 0; i < 12; i++) {
    const id = `GR-CONCURRENT-${i}`;
    const attempts = [
      () => admin.setOrderStatus(id, "pressing"),
      () => storefront.cancelOrderForCustomer(id, customerEmail),
    ];
    if (i % 2) attempts.reverse();
    await Promise.allSettled(attempts.map((attempt) => attempt()));
    const saved = (await storefront.readOrders()).find(
      (item) => item.id === id,
    );
    assert.ok(["pressing", "cancelled"].includes(saved.status));
    assert.equal(
      saved.history.length,
      2,
      "Only one competing transition may commit",
    );
  }

  // Server actions: session ownership, guest verification, errors, and refresh.
  let session = null;
  const invalidations = [];
  const actions = load("apps/storefront/app/account/actions.ts", {
    "@glowroot/data": {
      cancelOrderForCustomer: storefront.cancelOrderForCustomer,
      getProducts: async () => [],
      getPlans: async () => [],
      getDeliveryPartnerById: async () => null,
    },
    "@/lib/session": { getSessionUser: async () => session },
    "next/cache": { revalidatePath: (value) => invalidations.push(value) },
  });
  await storefront.appendOrder(order("GR-ACTION"));
  assert.equal((await actions.cancelMyOrder("GR-ACTION", "")).ok, false);
  session = { email: "someone-else@example.com" };
  const unauthorized = await actions.cancelMyOrder("GR-ACTION", "");
  assert.equal(unauthorized.ok, false);
  assert.equal(unauthorized.view, undefined);
  session = { email: customerEmail };
  const accountResult = await actions.cancelMyOrder(
    "GR-ACTION",
    "Duplicate order",
  );
  assert.equal(accountResult.view.order.status, "cancelled");
  assert.ok(invalidations.includes("/account/orders/GR-ACTION"));
  await storefront.appendOrder(order("GR-GUEST", "confirmed"));
  assert.equal(
    (await actions.cancelTrackedOrder("GR-GUEST", "wrong@example.com", "")).ok,
    false,
  );
  const guestResult = await actions.cancelTrackedOrder(
    "GR-GUEST",
    customerEmail,
    "",
  );
  assert.equal(guestResult.view.order.status, "cancelled");
  const staleResult = await actions.cancelTrackedOrder(
    "pressing",
    customerEmail,
    "",
  );
  assert.equal(staleResult.ok, false);
  assert.equal(staleResult.view.order.status, "pressing");

  // Render shared customer UI for each status, including the cancellation copy.
  const React = appRequire("react");
  const { renderToStaticMarkup } = appRequire("react-dom/server");
  const { CancelOrderControl } = load(
    "apps/storefront/components/CancelOrderControl.tsx",
    {
      "@glowroot/data/order-schedule": load(
        "packages/data/src/order-schedule.ts",
      ),
      "@glowroot/utils": { formatDate: (value) => value },
      "./DeliveryCalendar": load(
        "apps/storefront/components/DeliveryCalendar.tsx",
        {
          "@glowroot/data/order-schedule": load(
            "packages/data/src/order-schedule.ts",
          ),
        },
      ),
    },
  );
  const { OrderTimeline } = load(
    "apps/storefront/components/OrderTimeline.tsx",
    { "@glowroot/utils": { humanize: (value) => value } },
  );
  const renderControl = (status) =>
    renderToStaticMarkup(
      React.createElement(CancelOrderControl, {
        order: order("GR-UI", status),
        onCancel: async () => guestResult,
      }),
    );
  for (const status of ["pending", "confirmed"])
    assert.match(renderControl(status), />Cancel order<\/button>/);
  for (const status of [
    "pressing",
    "out-for-delivery",
    "delivered",
    "cancelled",
  ])
    assert.doesNotMatch(renderControl(status), />Cancel order<\/button>/);
  assert.match(
    renderControl("pressing"),
    /Contact support to request cancellation/,
  );
  const codHtml = renderToStaticMarkup(
    React.createElement(OrderTimeline, { order: result.order }),
  );
  assert.match(codHtml, /No payment is due/);
  const paidHtml = renderToStaticMarkup(
    React.createElement(OrderTimeline, { order: paidResult.order }),
  );
  assert.match(paidHtml, /does not automatically issue a refund/);
  assert.doesNotMatch(paidHtml, /is refunded to the original method/);

  // Database failures must fail closed.
  fixtureDb.failStorage();
  assert.equal(
    (await actions.cancelTrackedOrder("GR-GUEST", customerEmail, "")).ok,
    false,
  );
  console.log(
    "PASS: ownership, guest and account actions, status cutoffs, idempotency, concurrent admin updates, history, payment copy, UI states, and storage failure.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (fixtureDb) await fixtureDb.cleanup();
  });
