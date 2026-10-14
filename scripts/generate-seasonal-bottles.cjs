// Vector bottle artwork for seasonal-only juices. Existing photography is untouched.
const fs = require("node:fs/promises");
const path = require("node:path");
const ts = require("typescript");
const sharp = require("../packages/data/node_modules/sharp");
const root = path.resolve(__dirname, "..");
(async () => {
  const source = await fs.readFile(
    path.join(root, "packages/data/src/produce.ts"),
    "utf8",
  );
  const loaded = { exports: {} };
  new Function(
    "exports",
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
  )(loaded.exports);
  for (const item of loaded.exports.produce.filter(
    (p) => !["green-roots", "beet-boost"].includes(p.id),
  )) {
    const color = item.ring.to;
    const name = item.name.replace(/&/g, "&amp;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720">
      <defs>
        <linearGradient id="juice"><stop stop-color="${color}"/><stop offset=".4" stop-color="${item.ring.from}"/><stop offset="1" stop-color="${color}"/></linearGradient>
        <linearGradient id="glass"><stop stop-color="#ffffff" stop-opacity=".7"/><stop offset=".2" stop-color="#ffffff" stop-opacity=".08"/><stop offset=".7" stop-color="#ffffff" stop-opacity=".12"/><stop offset="1" stop-color="#ffffff" stop-opacity=".6"/></linearGradient>
        <radialGradient id="halo"><stop stop-color="${item.ring.from}" stop-opacity=".65"/><stop offset="1" stop-color="#fbf8ef" stop-opacity="0"/></radialGradient>
      </defs>
      <circle cx="360" cy="360" r="290" fill="url(#halo)"/>
      <ellipse cx="360" cy="647" rx="112" ry="13" fill="#2f5d34" opacity=".12"/>
      <path d="M315 119h90v72c0 36 59 48 59 91v326q0 29-29 29H285q-29 0-29-29V282c0-43 59-55 59-91Z" fill="url(#glass)" stroke="#b6bea4" stroke-width="3"/>
      <path d="M321 184h78v17c0 36 56 47 56 83v320q0 24-24 24H289q-24 0-24-24V284c0-36 56-47 56-83Z" fill="url(#juice)"/>
      <path d="M283 291v297" stroke="#fff" opacity=".4" stroke-width="12" stroke-linecap="round"/>
      <path d="M438 292v298" stroke="#fff" opacity=".2" stroke-width="5" stroke-linecap="round"/>
      <rect x="306" y="92" width="108" height="38" rx="9" fill="#2f5d34"/>
      <path d="M313 100h94M313 112h94" stroke="#628549" stroke-width="3"/>
      <rect x="267" y="359" width="186" height="175" rx="4" fill="#fcf8e9"/>
      <path d="M347 385q42-27 31 2-21 24-31-2" fill="#608443"/>
      <path d="m357 390 15-13" stroke="#fcf8e9" stroke-width="2"/>
      <text x="360" y="426" text-anchor="middle" font-family="Georgia,serif" font-size="32" fill="#2f5d34">GlowRoot</text>
      <text x="360" y="447" text-anchor="middle" font-family="sans-serif" font-size="9" letter-spacing="2.6" fill="#798060">COLD PRESSED</text>
      <path d="M304 462h112" stroke="#d8d8c4"/>
      <text x="360" y="488" text-anchor="middle" font-family="sans-serif" font-size="17" fill="#2f5d34">${name}</text>
      <text x="360" y="512" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#798060">250 ml · Pure goodness</text>
    </svg>`;
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    for (const app of ["storefront", "admin"]) {
      await fs.writeFile(
        path.join(
          root,
          `apps/${app}/public/assets/seasonal-bottle-${item.id}.png`,
        ),
        buffer,
      );
    }
  }
  console.log(
    "Created 11 seasonal bottle illustrations for storefront and admin.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
