// Rescheduling regressions use an isolated PostgreSQL schema, never the workspace orders.
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
  const schedule = load("packages/data/src/order-schedule.ts");
  assert.equal(schedule.nextDeliveryDate("2028-02-28"), "2028-02-29");
  assert.equal(
    schedule.nextDeliveryDate("2027-12-31T07:00:00+05:30"),
    "2028-01-01T07:00:00+05:30",
  );
  assert.equal(schedule.nextDeliveryDate("2027-02-29"), null);
  assert.equal(
    schedule.rescheduledDeliveryDate("2027-01-01T07:00:00+05:30", "2027-01-05"),
    "2027-01-05T07:00:00+05:30",
  );
  const future = new Date();
  future.setUTCFullYear(future.getUTCFullYear() + 1);
  const original = future.toISOString().slice(0, 10);
  const selected = schedule.nextDeliveryDate(
    schedule.nextDeliveryDate(original),
  );
  const store = fixtureDb.store;
  const admin = fixtureDb.admin;
  const fixture = (id, status = "confirmed") => ({
    ...order(id, status),
    deliveryDate: original,
    deliverySlot: "Morning · 8–10am",
    partnerId: "TEST-PARTNER",
    payment: { ...order(id).payment, method: "card", status: "paid" },
  });
  await store.appendOrder(fixture("GR-DATE"));
  const before = await fixtureDb.snapshot();
  for (const args of [
    ["GR-DATE", "wrong@example.com", original, selected],
    ["MISSING", customerEmail, original, selected],
    [null, customerEmail, original, selected],
    ["GR-DATE", customerEmail, original, "not-a-date"],
    ["GR-DATE", customerEmail, original, "2027-02-30"],
    ["GR-DATE", customerEmail, original, original],
    ["GR-DATE", customerEmail, original, "2020-01-01"],
  ]) {
    const result = await store.rescheduleOrderForCustomer(...args);
    assert.equal(result.ok, false);
    assert.equal(result.order, undefined);
  }
  assert.equal(await fixtureDb.snapshot(), before);
  const result = await store.rescheduleOrderForCustomer(
    " gr-date ",
    " CUSTOMER@example.com ",
    original,
    selected,
  );
  assert.equal(result.ok, true);
  assert.equal(result.order.deliveryDate, selected);
  assert.equal(result.order.status, "confirmed");
  assert.equal(result.order.deliverySlot, fixture("GR-DATE").deliverySlot);
  assert.deepEqual(result.order.payment, fixture("GR-DATE").payment);
  assert.equal(result.order.partnerId, undefined);
  assert.deepEqual(result.order.history.at(-1).deliveryChange, {
    from: original,
    to: selected,
  });
  assert.equal((await admin.readOrders())[0].deliveryDate, selected);
  const retry = await store.rescheduleOrderForCustomer(
    "GR-DATE",
    customerEmail,
    original,
    selected,
  );
  assert.deepEqual(retry.order, result.order);
  const stale = await store.rescheduleOrderForCustomer(
    "GR-DATE",
    customerEmail,
    original,
    schedule.nextDeliveryDate(selected),
  );
  assert.equal(stale.ok, false);
  assert.equal(stale.order.deliveryDate, selected);
  for (const status of [
    "pressing",
    "out-for-delivery",
    "delivered",
    "cancelled",
  ]) {
    await store.appendOrder(fixture(status, status));
    const denied = await store.rescheduleOrderForCustomer(
      status,
      customerEmail,
      original,
      selected,
    );
    assert.equal(denied.ok, false);
    assert.equal(denied.order.deliveryDate, original);
  }
  await store.appendOrder({ ...fixture("PAST"), deliveryDate: "2020-01-01" });
  assert.equal(
    (
      await store.rescheduleOrderForCustomer(
        "PAST",
        customerEmail,
        "2020-01-01",
        "2020-01-02",
      )
    ).ok,
    false,
  );
  await store.appendOrder(fixture("DOUBLE"));
  const parallel = await Promise.all([
    store.rescheduleOrderForCustomer(
      "DOUBLE",
      customerEmail,
      original,
      selected,
    ),
    admin.rescheduleOrderForCustomer(
      "DOUBLE",
      customerEmail,
      original,
      selected,
    ),
  ]);
  assert.ok(parallel.every((r) => r.ok));
  assert.equal(
    (await store.readOrders()).find((o) => o.id === "DOUBLE").history.length,
    2,
  );
  await store.appendOrder(fixture("RACE"));
  const racing = await Promise.all([
    admin.setOrderStatus("RACE", "pressing"),
    store.rescheduleOrderForCustomer("RACE", customerEmail, original, selected),
  ]);
  const saved = (await store.readOrders()).find((o) => o.id === "RACE");
  assert.equal(saved.status, "pressing");
  assert.equal(saved.deliveryDate, racing[1].ok ? selected : original);

  let session = null;
  const invalidations = [];
  const actions = load("apps/storefront/app/account/actions.ts", {
    "@glowroot/data": {
      ...store,
      getProducts: async () => [],
      getPlans: async () => [],
      getDeliveryPartnerById: async () => null,
    },
    "@/lib/session": { getSessionUser: async () => session },
    "next/cache": { revalidatePath: (p) => invalidations.push(p) },
  });
  await store.appendOrder(fixture("ACCOUNT"));
  assert.equal(
    (await actions.rescheduleMyOrder("ACCOUNT", original, selected)).ok,
    false,
  );
  session = { email: "wrong@example.com" };
  assert.equal(
    (await actions.rescheduleMyOrder("ACCOUNT", original, selected)).view,
    undefined,
  );
  session = { email: customerEmail };
  assert.equal(
    (await actions.rescheduleMyOrder("ACCOUNT", original, selected)).view.order
      .deliveryDate,
    selected,
  );
  assert.ok(invalidations.includes("/account/orders/ACCOUNT"));
  await store.appendOrder(fixture("GUEST", "pending"));
  assert.equal(
    (
      await actions.rescheduleTrackedOrder(
        "GUEST",
        "wrong@example.com",
        original,
        selected,
      )
    ).ok,
    false,
  );
  assert.equal(
    (
      await actions.rescheduleTrackedOrder(
        "GUEST",
        customerEmail,
        original,
        selected,
      )
    ).view.order.deliveryDate,
    selected,
  );
  fixtureDb.failStorage();
  assert.equal(
    (
      await actions.rescheduleTrackedOrder(
        "GUEST",
        customerEmail,
        original,
        selected,
      )
    ).ok,
    false,
  );
  console.log(
    "PASS: calendar dates, ownership, eligibility, persistence visible to admin, payments/slot preservation, idempotency, stale requests, concurrent preparation, guest/account actions and storage failures.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (fixtureDb) await fixtureDb.cleanup();
  });
