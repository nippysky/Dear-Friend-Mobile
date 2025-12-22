import React, { createContext, useContext, useMemo } from "react";
import { lightTokens, ThemeTokens } from "./tokens";

type Theme = { t: ThemeTokens };
const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({ t: lightTokens }), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
