import type { Config } from "tailwindcss";
import preset from "@glowroot/config/tailwind-preset";

const config: Config = {
  presets: [preset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    // scan the shared UI package so its Tailwind classes are generated
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Only the storefront uses these variables; the admin keeps its palette.
      colors: {
        cream: {
          DEFAULT: "rgb(var(--cream) / <alpha-value>)",
          2: "rgb(var(--cream-2) / <alpha-value>)",
        },
        paper: "rgb(var(--paper) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
      },
      // Brighter text in dark mode, while green buttons retain white contrast.
      textColor: {
        leaf: { DEFAULT: "rgb(var(--leaf-text) / <alpha-value>)" },
      },
    },
  },
  plugins: [],
};

export default config;
