"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

// Context is the connection between the provider and components that read it.
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: Theme;
}) {
  // useState owns the value. Context below shares that value and its action.
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  useEffect(() => {
    // CSS uses this attribute to choose the palette for the entire document.
    document.documentElement.dataset.theme = theme;
    // The server reads this preference on refresh, so the first paint matches.
    // If cookies are blocked, switching still works for the current page.
    try {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    } catch {
      // A saved preference is optional; the in-memory theme remains usable.
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
