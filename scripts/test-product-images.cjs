// Isolated image processing checks; never writes live uploads.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const sharp = require("../packages/data/node_modules/sharp");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "glowroot-images-"));
const source = fs.readFileSync(
  path.join(__dirname, "../packages/data/src/product-images.ts"),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;
const loaded = { exports: {} };
vm.runInThisContext("(function(require,module,exports){" + code + "\n})")(
  (id) =>
    id === "./repo-root"
      ? { dataFile: (name) => path.join(temporary, name) }
      : id === "sharp"
        ? sharp
        : require(id),
  loaded,
  loaded.exports,
);
(async () => {
  const { storeProductImage, readProductImage, productImageResponse } =
    loaded.exports;
  const original = await sharp({
    create: { width: 100, height: 200, channels: 3, background: "#00ff00" },
  })
    .png()
    .toBuffer();
  for (const fit of ["contain", "cover"]) {
    const url = await storeProductImage(original, fit, "north");
    const name = path.basename(url);
    const bytes = await readProductImage(name);
    const info = await sharp(bytes).metadata();
    assert.equal(info.width, 1320);
    assert.equal(info.height, 720);
    assert.equal(info.format, "webp");
    assert.equal((await productImageResponse(name)).status, 200);
  }
  await assert.rejects(
    storeProductImage(Buffer.from("not an image"), "contain", "centre"),
  );
  await assert.rejects(
    storeProductImage(Buffer.alloc(10 * 1024 * 1024 + 1), "contain", "centre"),
  );
  await assert.rejects(storeProductImage(original, "invalid", "centre"));
  assert.equal((await productImageResponse("../secret")).status, 404);
  assert.equal(
    (await productImageResponse("00000000-0000-0000-0000-000000000000.webp"))
      .status,
    404,
  );
  console.log(
    "PASS: fit/fill WebP processing, dimensions, reads, invalid files, size limits, framing and path protection.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(temporary, { recursive: true, force: true }));
