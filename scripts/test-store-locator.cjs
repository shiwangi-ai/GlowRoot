// Run with: node scripts/test-store-locator.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync(
  "apps/storefront/lib/store-locations.ts",
  "utf8",
);
const context = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  context,
);
const { matchesStore, locateStore } = context.exports;
const shop = {
  id: "test",
  name: "GlowRoot Central",
  address: "12 Test Road",
  city: "Bengaluru",
  pincode: "560001",
  phone: "",
};
const result = (overrides = {}) => ({
  partial_match: false,
  geometry: { location_type: "ROOFTOP", location: { lat: 12.97, lng: 77.59 } },
  address_components: [{ types: ["postal_code"], long_name: "560001" }],
  ...overrides,
});

async function main() {
  assert.ok(matchesStore(shop, "  GLOWROOT   Bengaluru "));
  assert.ok(matchesStore(shop, "560001"));
  assert.ok(matchesStore(shop, "test road"));
  assert.ok(matchesStore(shop, ""));
  assert.equal(matchesStore(shop, "140301"), false);
  assert.equal(matchesStore(shop, "GlowRoot Mumbai"), false);

  let calls = 0;
  const exact = await locateStore(
    {
      geocode: async () => {
        calls++;
        return { results: [result()] };
      },
    },
    shop,
  );
  assert.equal(exact.approximate, false);
  assert.equal(calls, 1, "an exact address needs only one request");

  for (const candidate of [
    null,
    result({ partial_match: true }),
    result({ geometry: { location_type: "APPROXIMATE", location: {} } }),
    result({
      address_components: [{ types: ["postal_code"], long_name: "140301" }],
    }),
  ]) {
    const requests = [];
    const fallbackPosition = { lat: 12.98, lng: 77.6 };
    const located = await locateStore(
      {
        geocode: async (request) => {
          requests.push(request);
          return {
            results:
              requests.length === 1
                ? candidate
                  ? [candidate]
                  : []
                : [{ geometry: { location: fallbackPosition } }],
          };
        },
      },
      shop,
    );
    assert.equal(
      located.approximate,
      true,
      "partial, coarse, wrong-pincode or missing addresses must be labeled approximate",
    );
    assert.equal(located.position, fallbackPosition);
    assert.equal(
      requests[1].address,
      undefined,
      "fallback uses only the pincode",
    );
    assert.equal(requests[1].componentRestrictions.postalCode, shop.pincode);
  }
  assert.equal(
    await locateStore({ geocode: async () => ({ results: [] }) }, shop),
    null,
  );
  await assert.rejects(
    locateStore(
      {
        geocode: async () => {
          throw new Error("REQUEST_DENIED");
        },
      },
      shop,
    ),
    /REQUEST_DENIED/,
  );
  console.log(
    "Store locator: search, exact address, approximate fallback, pincode mismatch, no results and API failure passed.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
