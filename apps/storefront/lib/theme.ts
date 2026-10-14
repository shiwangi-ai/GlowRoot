export type Theme = "light" | "dark";

export const THEME_COOKIE = "glowroot.theme";

export function parseTheme(value: string | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}
