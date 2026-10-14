const assert = require("node:assert/strict");
const { setup, load, appRequire } = require("./customer-db-test-support.cjs");
let fixture;
(async () => {
  fixture = await setup();
  const { db, users, sessions, store, auth } = fixture;
  const now = new Date().toISOString();
  const user = {
    name: "Customer",
    email: "customer@example.com",
    phone: "1234567890",
    passwordHash: auth.hashPassword("test-password"),
    createdAt: now,
    updatedAt: now,
  };
  const registrations = await Promise.all([
    users.registerUser(user),
    users.registerUser({
      ...user,
      email: "CUSTOMER@example.com",
      passwordHash: auth.hashPassword("other-password"),
    }),
  ]);
  assert.equal(
    registrations.filter(Boolean).length,
    1,
    "Only one concurrent registration can claim credentials",
  );
  assert.equal(await db.customer.count(), 1);
  const saved = await users.findUser(" CUSTOMER@example.com ");
  assert.equal(saved.passwordHash, registrations.find(Boolean).passwordHash);
  const session = await sessions.insertSession({
    email: user.email,
    role: "customer",
  });
  assert.equal((await sessions.findSession(session.token)).email, user.email);
  assert.equal(
    await db.customerSession.count({ where: { tokenHash: session.token } }),
    0,
  );
  await sessions.deleteSession(session.token);
  assert.equal(await sessions.findSession(session.token), undefined);
  const expired = await sessions.insertSession({
    email: user.email,
    role: "customer",
  });
  await db.customerSession.updateMany({ data: { expiresAt: new Date(0) } });
  assert.equal(await sessions.findSession(expired.token), undefined);

  const order = {
    id: "DB-ORDER",
    customer: {
      name: "Original Name",
      email: user.email,
      address: "Original address",
      phone: user.phone,
    },
    items: [{ productSlug: "juice", qty: 2, priceINR: 100 }],
    type: "one-time",
    status: "confirmed",
    totalINR: 200,
    createdAt: now,
    deliveryDate: "2028-01-01T07:00:00+05:30",
    history: [],
  };
  await store.appendOrder(order);
  await users.upsertUserProfile({
    name: "Updated Name",
    email: user.email,
    phone: "",
    address: "New address",
    nowISO: now,
  });
  assert.equal(
    (await store.readOrders())[0].customer.address,
    "Original address",
  );
  assert.equal((await users.findUser(user.email)).phone, user.phone);
  assert.equal((await users.findUser(user.email)).address, "New address");
  await assert.rejects(
    store.appendOrder({
      ...order,
      customer: { ...order.customer, email: "rollback@example.com" },
    }),
  );
  assert.equal(
    await users.findUser("rollback@example.com"),
    undefined,
    "Order failure rolls back profile creation",
  );
  const guest = await users.upsertUserProfile({
    name: "Guest",
    email: "guest@example.com",
    address: "Guest address",
    nowISO: now,
  });
  assert.equal(guest.passwordHash, "");
  await users.registerUser({ ...user, email: guest.email });
  assert.equal((await users.findUser(guest.email)).address, "Guest address");

  const { canViewCustomers } = load("apps/admin/lib/customer-access.ts");
  for (const role of ["owner", "super-admin", "admin"])
    assert.equal(
      canViewCustomers({
        roleKeys: [role],
        permissions: new Set(["customers.view"]),
      }),
      true,
    );
  for (const role of [
    "customer-support",
    "operations-manager",
    "fulfilment-agent",
    "finance-manager",
    "read-only",
    "customer",
  ])
    assert.equal(
      canViewCustomers({
        roleKeys: [role],
        permissions: new Set([
          "customers.view",
          "orders.view_delivery_details",
        ]),
      }),
      false,
    );
  assert.equal(
    canViewCustomers({ roleKeys: ["admin"], permissions: new Set() }),
    false,
  );
  // Direct route attempts fail before any customer query can execute.
  const { requireCustomerAdmin } = load("apps/admin/lib/access.ts", {
    "server-only": {},
    react: { cache: (f) => f },
    "next/navigation": {
      redirect: (location) => {
        throw new Error(location);
      },
    },
    "./session": {
      readAdminSession: async () => ({
        user: {
          id: "staff",
          name: "Staff",
          email: "staff@example.com",
          roles: [
            {
              role: {
                key: "customer-support",
                name: "Support",
                permissions: [{ permission: { key: "customers.view" } }],
              },
            },
          ],
        },
      }),
    },
    "./customer-access": { canViewCustomers },
  });
  await assert.rejects(requireCustomerAdmin(), /denied/);

  // Render the actual server pages against synthetic DB records.
  const utils = load("packages/utils/src/index.ts");
  const { renderToStaticMarkup } = appRequire("react-dom/server");
  let allowed = true;
  const pageDeps = {
    "@glowroot/db": { db },
    "@glowroot/utils": utils,
    "@/components/ModuleHeading": load(
      "apps/admin/components/ModuleHeading.tsx",
      {
        "@/components/ModuleIcon": load("apps/admin/components/ModuleIcon.tsx"),
      },
    ),
    "@/components/StatusBadge": load("apps/admin/components/StatusBadge.tsx", {
      "@glowroot/utils": utils,
    }),
    "@/lib/access": {
      requireCustomerAdmin: async () => {
        if (!allowed) throw new Error("denied");
      },
    },
    "next/navigation": {
      notFound: () => {
        throw new Error("not-found");
      },
    },
  };
  const listPage = load("apps/admin/app/customers/page.tsx", pageDeps).default;
  const detailPage = load(
    "apps/admin/app/customers/[id]/page.tsx",
    pageDeps,
  ).default;
  const listHtml = renderToStaticMarkup(
    await listPage({ searchParams: Promise.resolve({ q: "UPDATED" }) }),
  );
  assert.match(listHtml, /Updated Name/);
  assert.doesNotMatch(listHtml, /Guest address|passwordHash|pbkdf2/);
  const emptyHtml = renderToStaticMarkup(
    await listPage({ searchParams: Promise.resolve({ q: "no-match" }) }),
  );
  assert.match(emptyHtml, /No matching customers/);
  const row = await db.customer.findUnique({ where: { email: user.email } });
  const detailHtml = renderToStaticMarkup(
    await detailPage({
      params: Promise.resolve({ id: row.id }),
      searchParams: Promise.resolve({}),
    }),
  );
  assert.match(detailHtml, /New address/);
  assert.match(detailHtml, /DB-ORDER/);
  assert.doesNotMatch(detailHtml, /passwordHash|pbkdf2/);
  await assert.rejects(
    detailPage({
      params: Promise.resolve({ id: "invalid" }),
      searchParams: Promise.resolve({}),
    }),
    /not-found/,
  );
  allowed = false;
  await assert.rejects(
    listPage({ searchParams: Promise.resolve({}) }),
    /denied/,
  );
  await assert.rejects(
    detailPage({
      params: Promise.resolve({ id: row.id }),
      searchParams: Promise.resolve({}),
    }),
    /denied/,
  );
  console.log(
    "PASS: database persistence, concurrent registration, credentials, sessions/expiry/logout, profile/order separation, atomic checkout rollback and admin-only access.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (fixture) await fixture.cleanup();
  });
