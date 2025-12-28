import { useTheme } from "@/src/theme/ThemeProvider";
import React from "react";
import { Platform, Text as RNText, type TextProps, type TextStyle } from "react-native";

type Variant = "body" | "muted" | "label" | "title" | "headline" | "button";
type Weight = "regular" | "medium" | "semibold";

function variantBase(t: any, v: Variant): TextStyle {
  switch (v) {
    case "headline":
      return { fontSize: t.text["2xl"], lineHeight: t.line["2xl"], color: t.color.text };
    case "title":
      return { fontSize: t.text.xl, lineHeight: t.line.xl, color: t.color.text };
    case "button":
      return { fontSize: t.text.md, lineHeight: t.line.md, color: t.color.textOnAccent };
    case "label":
      return { fontSize: t.text.xs, lineHeight: t.line.xs, color: t.color.textMuted };
    case "muted":
      return { fontSize: t.text.sm, lineHeight: t.line.sm, color: t.color.textMuted };
    default:
      return { fontSize: t.text.md, lineHeight: t.line.md, color: t.color.text };
  }
}

export function AppText({
  variant = "body",
  weight,
  style,
  ...props
}: TextProps & { variant?: Variant; weight?: Weight; style?: TextStyle | TextStyle[] }) {
  const { t } = useTheme();

  const w: Weight =
    weight ??
    (variant === "headline" || variant === "title" || variant === "button"
      ? "semibold"
      : variant === "label"
      ? "medium"
      : "regular");

  const fontWeight =
    w === "regular" ? t.font.regular : w === "medium" ? t.font.medium : t.font.semibold;

  return (
    <RNText
      {...props}
      style={[
        variantBase(t, variant),
        {
          fontFamily: t.font.family,
          fontWeight, // ✅ uses variable axis if supported
          letterSpacing: -0.2,
          ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
        },
        style,
      ]}
    />
  );
}
