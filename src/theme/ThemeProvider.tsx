// src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useMemo } from "react";
import { Text, TextInput } from "react-native";
import { lightTokens, ThemeTokens } from "./tokens";

type Theme = { t: ThemeTokens };
const ThemeContext = createContext<Theme | null>(null);

// Ensure we only set global defaults once (Fast Refresh safe)
let didSetGlobalFont = false;

function setGlobalFontFamily(fontFamily: string) {
  if (didSetGlobalFont) return;
  didSetGlobalFont = true;

  // RN types don't expose defaultProps anymore; runtime still supports it.
  const RNText = Text as any;
  const RNTextInput = TextInput as any;

  RNText.defaultProps = RNText.defaultProps ?? {};
  RNText.defaultProps.style = [{ fontFamily }, RNText.defaultProps.style];

  RNTextInput.defaultProps = RNTextInput.defaultProps ?? {};
  RNTextInput.defaultProps.style = [{ fontFamily }, RNTextInput.defaultProps.style];
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Set Lexend globally for Text + TextInput
  setGlobalFontFamily("Lexend");

  const value = useMemo(() => ({ t: lightTokens }), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
