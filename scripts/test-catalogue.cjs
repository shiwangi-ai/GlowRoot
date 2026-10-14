// Isolated persistence checks: never writes the live catalogue.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "glowroot-catalogue-"));
function load(name) {
  const source = fs.readFileSync(
    path.join(root, "packages/data/src", name + ".ts"),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) =>
    id === "./repo-root"
      ? { dataFile: (name) => path.join(temporary, name) }
      : id.startsWith("./")
        ? load(id.slice(2))
        : require(id);
  vm.runInThisContext("(function(require,module,exports){" + code + "\n})")(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}
(async () => {
  const { readCatalogue, saveCatalogueProduct } = load("catalogue");
  const original = await readCatalogue();
  const product = original.find((p) => p.slug === "green-roots");
  assert.ok(product);
  await assert.rejects(
    saveCatalogueProduct(product.slug, { ...product, priceINR: 200 }, false),
    /permission/,
  );
  await assert.rejects(saveCatalogueProduct(null, product, true), /already/);
  await assert.rejects(
    saveCatalogueProduct(
      product.slug,
      { ...product, recipe: [{ materialId: "unknown", grams: 10 }] },
      true,
    ),
    /material/,
  );
  await assert.rejects(
    saveCatalogueProduct(
      product.slug,
      { ...product, recipe: [product.recipe[0], product.recipe[0]] },
      true,
    ),
    /only once/,
  );
  await assert.rejects(
    saveCatalogueProduct(product.slug, { ...product, priceINR: -1 }, true),
    /price/,
  );
  await assert.rejects(
    saveCatalogueProduct(product.slug, { ...product, slug: "changed" }, true),
    /URL/,
  );
  await Promise.all([
    saveCatalogueProduct(
      product.slug,
      { ...product, description: "Saved test description" },
      false,
    ),
    saveCatalogueProduct(
      null,
      { ...product, slug: "test-juice", name: "Test juice" },
      true,
    ),
  ]);
  const reloaded = await load("catalogue").readCatalogue();
  assert.equal(reloaded.length, original.length + 1);
  assert.equal(
    reloaded.find((p) => p.slug === product.slug).description,
    "Saved test description",
  );
  assert.deepEqual(
    reloaded.find((p) => p.slug === "summer-crush"),
    original.find((p) => p.slug === "summer-crush"),
  );
  fs.writeFileSync(
    path.join(temporary, ".glowroot-catalogue.json"),
    "broken json",
  );
  await assert.rejects(readCatalogue());
  console.log(
    "PASS: persistence across reload, concurrent saves, unchanged products, price permissions, duplicate URLs, recipe validation, URL stability and corrupt-file protection.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(temporary, { recursive: true, force: true }));
