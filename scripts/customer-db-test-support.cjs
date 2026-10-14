// Integration tests use their own temporary PostgreSQL schema, never live rows.
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const dbRequire = createRequire(path.join(root, "packages/db/package.json"));
const appRequire = createRequire(
  path.join(root, "apps/storefront/package.json"),
);
const prisma = dbRequire("@prisma/client");

function load(file, dependencies = {}) {
  const code = ts.transpileModule(
    fs.readFileSync(path.join(root, file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    (id) => dependencies[id] ?? appRequire(id),
    module,
    module.exports,
  );
  return module.exports;
}

async function setup() {
  if (!process.env.DATABASE_URL)
    process.loadEnvFile(path.join(root, "packages/db/.env"));
  const schema = `customer_test_${process.pid}_${Date.now()}`;
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("schema", schema);
  const db = new prisma.PrismaClient({ datasourceUrl: url.toString() });
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  for (const table of ["customers", "customer_orders", "customer_sessions"]) {
    await db.$executeRawUnsafe(
      `CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`,
    );
  }
  await db.$executeRawUnsafe(
    `ALTER TABLE "${schema}".customer_orders ADD FOREIGN KEY (customer_id) REFERENCES "${schema}".customers(id) ON DELETE RESTRICT`,
  );
  await db.$executeRawUnsafe(
    `ALTER TABLE "${schema}".customer_sessions ADD FOREIGN KEY (customer_id) REFERENCES "${schema}".customers(id) ON DELETE CASCADE`,
  );
  // CITEXT operators live in public; include them as in the app's public schema.
  const transaction = db.$transaction.bind(db);
  db.$transaction = (operation, options) =>
    transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL search_path TO "${schema}", public`,
      );
      return operation(tx);
    }, options);
  const database = { ...prisma, db };
  const auth = load("packages/auth/src/index.ts");
  const users = load("packages/data/src/users.ts", {
    "@glowroot/db": database,
    "@glowroot/auth": auth,
  });
  const sessions = load("packages/data/src/sessions.ts", {
    "@glowroot/db": database,
    "@glowroot/auth": auth,
  });
  const records = load("packages/data/src/order-record.ts", {
    "@glowroot/db": database,
  });
  const dependencies = {
    "@glowroot/db": database,
    "./users": users,
    "./order-record": records,
    "./order-schedule": load("packages/data/src/order-schedule.ts"),
  };
  const store = load("packages/data/src/store.ts", dependencies);
  return {
    db,
    users,
    sessions,
    store,
    auth,
    admin: load("packages/data/src/store.ts", dependencies),
    snapshot: async () =>
      JSON.stringify(
        await db.customerOrder.findMany({ orderBy: { id: "asc" } }),
      ),
    failStorage: () => {
      db.$transaction = async () => {
        throw new Error("Database unavailable");
      };
    },
    cleanup: async () => {
      await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      await db.$disconnect();
    },
  };
}
module.exports = { setup, load, appRequire };
