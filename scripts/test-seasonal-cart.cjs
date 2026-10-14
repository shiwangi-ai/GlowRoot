// Isolated cart/checkout regressions; never places an order or changes live data.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
function load(file, dependencies = {}, extra = "") {
  const source = fs.readFileSync(path.join(root, file), "utf8") + extra;
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    (id) => dependencies[id] ?? require(id),
    module,
    module.exports,
  );
  return module.exports;
}
(async () => {
  const { produce } = load("packages/data/src/produce.ts");
  const { products } = load("packages/data/src/products.ts");
  const seasonal = load("packages/data/src/seasonal.ts");
  const { resolveSeasonalProduct, reconcileCart } = seasonal;
  const green = produce.find((p) => p.id === "green-roots");
  const realGreen = products.find((p) => p.slug === "green-roots");
  assert.equal(resolveSeasonalProduct(green, products), realGreen);
  assert.equal(realGreen.priceINR, 190);
  assert.equal(realGreen.volumeMl, 100);
  for (const item of produce) {
    assert.ok(
      products.some((p) => p.slug === item.id),
      `${item.name} is missing from Our Juices`,
    );
    const product = resolveSeasonalProduct(item, products);
    assert.notEqual(product.imageUrl, item.imageUrl);
    assert.ok(
      fs.existsSync(
        path.join(root, "apps/storefront/public", product.imageUrl),
      ),
    );
    assert.ok(product.ingredients.length > 0);
  }
  const currentGreen = {
    ...realGreen,
    priceINR: 215,
    imageUrl: "/assets/green-roots-v2.png",
  };
  const catalogue = products.map((p) =>
    p.slug === currentGreen.slug ? currentGreen : p,
  );
  const seasonalProducts = produce.map((p) =>
    resolveSeasonalProduct(p, catalogue),
  );
  const legacy = {
    ...realGreen,
    slug: "produce-green-roots",
    priceINR: 150,
    imageUrl: green.imageUrl,
    volumeMl: 250,
  };
  const cart = [
    { product: legacy, qty: 2 },
    { product: realGreen, qty: 1 },
  ];
  const updated = reconcileCart(cart, [...catalogue, ...seasonalProducts]);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].qty, 3);
  assert.equal(updated[0].product, currentGreen);
  assert.equal(cart[0].qty, 2);
  const bundle = {
    product: { ...realGreen, slug: "bundle::green-roots-3" },
    qty: 1,
    contents: [{ productSlug: "green-roots", qty: 3 }],
  };
  assert.deepEqual(reconcileCart([bundle], catalogue), [bundle]);
  const checkout = load(
    "apps/storefront/app/checkout/actions.ts",
    {
      "@glowroot/data": {
        getProducts: async () => catalogue,
        getProduce: async () => produce,
        getCombos: async () => [],
        getBundles: async () => [],
      },
      "@glowroot/data/seasonal": seasonal,
      "@/lib/session": {},
    },
    "\nexport { canonicaliseItems };\n",
  );
  for (const slug of ["green-roots", "produce-green-roots"]) {
    const result = await checkout.canonicaliseItems([
      { productSlug: slug, priceINR: 1, qty: 2 },
    ]);
    assert.deepEqual(result, {
      ok: true,
      items: [{ productSlug: "green-roots", priceINR: 215, qty: 2 }],
    });
  }
  for (const item of produce) {
    const product = resolveSeasonalProduct(item, catalogue);
    const result = await checkout.canonicaliseItems([
      { productSlug: product.slug, priceINR: 1, qty: 1 },
    ]);
    assert.equal(result.ok, true);
    assert.equal(result.items[0].priceINR, product.priceINR);
  }
  const promotedJuicePrices = {
    mango: 110,
    watermelon: 110,
    litchi: 110,
    grapes: 110,
    sugarcane: 110,
    carrot: 120,
    beetroot: 120,
    cucumber: 120,
    tomato: 120,
    "root-reset": 150,
    "carrot-glow": 150,
  };
  for (const [slug, priceINR] of Object.entries(promotedJuicePrices)) {
    const product = products.find((p) => p.slug === slug);
    assert.ok(product, `${slug} must be listed in the shared catalogue`);
    assert.equal(product.priceINR, priceINR);
    assert.equal(product.volumeMl, 250);
    const imageGroup = ["root-reset", "carrot-glow"].includes(slug)
      ? "blend"
      : "single";
    assert.equal(product.imageUrl, `/assets/juice-${imageGroup}-${slug}.webp`);
    assert.ok(
      fs.existsSync(path.join(root, "apps/admin/public", product.imageUrl)),
    );
    const migrated = reconcileCart(
      [
        {
          product: {
            ...product,
            slug: `produce-${slug}`,
            imageUrl: `/assets/seasonal-bottle-${slug}.png`,
          },
          qty: 1,
        },
        { product, qty: 1 },
      ],
      products,
    );
    assert.equal(migrated.length, 1);
    assert.equal(migrated[0].product, product);
    assert.equal(migrated[0].qty, 2);
    const result = await checkout.canonicaliseItems([
      { productSlug: `produce-${slug}`, priceINR: 1, qty: 1 },
    ]);
    assert.deepEqual(result, {
      ok: true,
      items: [{ productSlug: slug, priceINR, qty: 1 }],
    });
  }
  const invalid = await checkout.canonicaliseItems([
    { productSlug: "green-roots", qty: 0 },
  ]);
  assert.equal(invalid.ok, false);
  console.log(
    "PASS: all 13 seasonal bottle assets, current catalogue prices and volumes, legacy cart migration/merge, bundle preservation, server checkout pricing and invalid quantities.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
