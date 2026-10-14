/**
 * Shared Tailwind preset — the GlowRoot design-token system.
 *
 * These values are a 1:1 port of the CSS custom properties in the original
 * GlowRoot.html prototype (`--leaf`, `--carrot`, `--cream`, …). Both apps
 * (storefront + admin) extend this preset so they share one design language.
 *
 * `background:var(--leaf)` -> `bg-leaf`, `color:var(--carrot)` -> `text-carrot`, etc.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        leaf: { DEFAULT: "#2f5d34", deep: "#193d20", soft: "#5a8a4a" },
        carrot: "#d9772e",
        berry: "#7a4a8f",
        apple: "#d4533a",
        gold: "#e8b23f",
        cream: { DEFAULT: "#f6f0e2", 2: "#efe6d2" },
        paper: "#fbf8f0",
        ink: { DEFAULT: "#243018", soft: "#5b6450" },
        line: "#e0d6bf",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "serif"],
        body: ['"Hanken Grotesque"', "sans-serif"],
        script: ['"Caveat"', "cursive"],
      },
      maxWidth: {
        wrap: "1200px",
      },
      boxShadow: {
        card: "0 26px 46px -26px rgba(40,55,25,.5)",
        float: "0 16px 34px -18px rgba(40,55,25,.45)",
        pop: "0 26px 50px -24px rgba(40,55,25,.5)",
      },
    },
  },
};
