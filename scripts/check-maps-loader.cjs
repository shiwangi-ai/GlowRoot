// Run with: node scripts/check-maps-loader.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

async function check(app) {
  const source = fs.readFileSync(`apps/${app}/lib/google-maps.ts`, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const scripts = [];
  const timers = new Map();
  let timerId = 0;
  const window = {
    setTimeout(fn) {
      timers.set(++timerId, fn);
      return timerId;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  const context = {
    exports: {},
    window,
    URLSearchParams,
    process: { env: { NEXT_PUBLIC_GOOGLE_MAPS_KEY: "test-key" } },
    document: {
      createElement() {
        return {
          remove() {
            this.removed = true;
          },
        };
      },
      head: {
        appendChild(script) {
          scripts.push(script);
        },
      },
    },
  };
  vm.runInNewContext(code, context);
  const load = context.exports.loadGoogleMaps;
  const first = load();
  assert.equal(load(), first, "concurrent calls share one request");
  assert.equal(scripts.length, 1);
  scripts[0].onerror();
  await assert.rejects(first, /could not load/);
  assert.ok(scripts[0].removed);
  const retry = load();
  const callback = new URL(scripts[1].src).searchParams.get("callback");
  assert.notEqual(
    callback,
    new URL(scripts[0].src).searchParams.get("callback"),
  );
  let resolved = false;
  retry.then(() => {
    resolved = true;
  });
  await Promise.resolve();
  assert.equal(resolved, false, "waits for Google callback");
  window.google = {
    maps: { Map() {}, Geocoder() {}, Marker() {}, importLibrary() {} },
  };
  window[callback]();
  assert.equal(await retry, window.google.maps);
  assert.equal(timers.size, 0);
  assert.equal(await load(), window.google.maps);

  // A callback is not proof that Google's namespace or required classes exist.
  for (const google of [undefined, {}, { maps: {} }, { maps: { Map() {} } }]) {
    delete window.__glowrootMapsLoader;
    window.google = google;
    const pending = load();
    const failed = scripts.at(-1);
    const name = new URL(failed.src).searchParams.get("callback");
    assert.doesNotThrow(
      () => window[name](),
      "an incomplete API must not crash the page",
    );
    await assert.rejects(pending, /could not load/);
    assert.equal(timers.size, 0);
    assert.ok(failed.removed);
    assert.equal(
      window.__glowrootMapsLoader,
      undefined,
      "a failed callback must allow retry",
    );
  }

  const timedOut = load();
  const oldScript = scripts.at(-1);
  const lateCallback =
    window[new URL(oldScript.src).searchParams.get("callback")];
  const lateError = oldScript.onerror;
  for (const fn of [...timers.values()]) fn();
  await assert.rejects(timedOut, /could not load/);
  assert.ok(oldScript.removed);
  const recovered = load();
  assert.doesNotThrow(
    lateCallback,
    "late callbacks after timeout must be harmless",
  );
  lateError();
  assert.equal(
    load(),
    recovered,
    "old errors must not clear the retry request",
  );
  window.google = {
    maps: { Map() {}, Geocoder() {}, Marker() {}, importLibrary() {} },
  };
  const successfulScript = scripts.at(-1);
  const afterSuccessError = successfulScript.onerror;
  window[new URL(successfulScript.src).searchParams.get("callback")]();
  assert.equal(await recovered, window.google.maps);
  afterSuccessError();
  assert.equal(
    load(),
    recovered,
    "late errors after success must not reset the loader",
  );
  assert.equal(timers.size, 0);
  assert.ok(!successfulScript.removed);
  console.log(
    `${app}: concurrency, missing/partial API, timeout, stale callbacks, cleanup, and retry passed`,
  );
}
(async () => {
  await check("admin");
  await check("storefront");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
