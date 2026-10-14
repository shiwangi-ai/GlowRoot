// Read-only verification; print counts only, never imported personal data.
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const { PrismaClient } = createRequire(
  path.join(root, "packages/db/package.json"),
)("@prisma/client");
if (!process.env.DATABASE_URL)
  process.loadEnvFile(path.join(root, "packages/db/.env"));
const db = new PrismaClient();
function read(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}
function check(ok, field) {
  if (!ok) throw new Error(`Import mismatch in ${field}`);
}
(async () => {
  const users = read(".glowroot-users.json");
  const orders = read(".glowroot-orders.json");
  for (const user of users) {
    const row = await db.customer.findUnique({
      where: { email: user.email.trim().toLowerCase() },
    });
    check(Boolean(row), "customer presence");
    for (const key of ["name", "phone", "address", "pincode", "passwordHash"])
      check((row[key] ?? undefined) === user[key], `customer ${key}`);
    check(
      row.createdAt.toISOString() === new Date(user.createdAt).toISOString(),
      "customer creation date",
    );
  }
  const equalJson = (a, b) => require("node:util").isDeepStrictEqual(a, b);
  for (const order of orders) {
    const row = await db.customerOrder.findUnique({
      where: { id: order.id },
      include: { customer: { select: { email: true } } },
    });
    check(Boolean(row), "order presence");
    check(
      row.customer.email === order.customer.email.trim().toLowerCase(),
      "order ownership",
    );
    for (const key of [
      "status",
      "type",
      "totalINR",
      "deliveryDate",
      "deliverySlot",
      "deliveryPincode",
      "partnerId",
      "planSlug",
    ])
      check((row[key] ?? undefined) === order[key], `order ${key}`);
    for (const key of ["items", "payment", "history"])
      check(equalJson(row[key] ?? undefined, order[key]), `order ${key}`);
    for (const key of ["name", "phone", "address"])
      check(
        (row[`customer${key[0].toUpperCase()}${key.slice(1)}`] ?? undefined) ===
          order.customer[key],
        "order contact snapshot",
      );
  }
  check(
    (await db.adminRolePermission.count({
      where: {
        permission: { module: "customers" },
        role: { key: { notIn: ["owner", "admin", "super-admin"] } },
      },
    })) === 0,
    "role restriction",
  );
  console.log(
    `PASS: ${users.length} source accounts and ${orders.length} orders preserved; role restrictions verified.`,
  );
})()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
