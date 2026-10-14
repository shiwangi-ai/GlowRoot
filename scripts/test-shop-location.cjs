const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "glowroot-shops-"));
const source = fs.readFileSync(
  path.join(__dirname, "../packages/data/src/shops.ts"),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const loaded = { exports: {} };
vm.runInThisContext("(function(require,module,exports){" + code + "\n})")(
  (id) =>
    id === "./repo-root"
      ? { dataFile: (name) => path.join(temporary, name) }
      : id === "./zones"
        ? { readServiceAreas: async () => [{ id: "one" }, { id: "two" }] }
        : require(id),
  loaded,
  loaded.exports,
);
(async () => {
  const { saveShop, getShops } = loaded.exports;
  const draft = {
    name: "Test store",
    address: "1 Test Street",
    city: "Test city",
    pincode: "560001",
    phone: "",
    areaIds: ["one"],
  };
  for (const areaIds of [[], ["one", "two"], ["one", "one"], ["missing"]])
    await assert.rejects(saveShop(null, { ...draft, areaIds }));
  const first = await saveShop(null, draft);
  await saveShop(null, { ...draft, name: "Second store" });
  await assert.rejects(
    saveShop(first.id, { ...draft, areaIds: ["one", "two"] }),
  );
  await saveShop(first.id, { ...draft, areaIds: ["two"] });
  const shops = await getShops();
  assert.deepEqual(
    shops.map((s) => s.areaIds),
    [["two"], ["one"]],
  );
  console.log(
    "PASS: exactly one location required; shared locations allowed; reassignment replaces the original; invalid updates rejected.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(temporary, { recursive: true, force: true }));
