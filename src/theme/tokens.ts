export const lightTokens = {
  color: {
    bg: "#FAF7F2",
    surface: "#FFFFFF",
    surfaceAlt: "#F5F1EB",
    text: "#0B1220",
    textMuted: "#6B7280",
    textOnAccent: "#FAF7F2",
    border: "#E6DED5",
    accent: "#0B1220",
    accentSoft: "#E6F2EF",
    blush: "#E53935",
    blushSoft: "#F6E3DE",
  },

  // ✅ one variable family, but we standardize weights
  font: {
    family: "Lexend",
    regular: "400",
    medium: "500",
    semibold: "600",
  },

  radius: { sm: 10, md: 14, lg: 18, xl: 24, pill: 9999 },
  space: { 0: 0, 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32, 40: 40, 48: 48 },
  text: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, "2xl": 28 },
  line: { xs: 16, sm: 20, md: 24, lg: 26, xl: 30, "2xl": 36 },
} as const;
