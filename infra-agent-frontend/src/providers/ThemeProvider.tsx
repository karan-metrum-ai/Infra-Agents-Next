"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // The product is dark-only (DESIGN.md D1) -- clear any stale preference
    // from an earlier build so it can't reintroduce a broken light state.
    localStorage.removeItem("theme");
    sessionStorage.removeItem("theme");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }, []);

  const toggleTheme = () => {
    // Deliberate no-op -- there is no light theme to switch to.
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
