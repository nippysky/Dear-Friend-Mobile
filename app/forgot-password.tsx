// app/forgot-password.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../src/components/ui/AppText";
import { apiFetch } from "../src/lib/api";
import { useTheme } from "../src/theme/ThemeProvider";

function withAlpha(color: string, alpha: number) {
  if (!color || typeof color !== "string") return color;
  const a = Math.max(0, Math.min(1, alpha));
  if (color.startsWith("rgba(") || color.startsWith("rgb(")) return color;

  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const expand = (s: string) => s.split("").map((ch) => ch + ch).join("");
    const h = hex.length === 3 ? expand(hex) : hex;
    if (h.length !== 6) return color;

    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return color;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return color;
}

export default function ForgotPassword() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const emailRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const emailTrim = useMemo(() => email.trim().toLowerCase(), [email]);
  const valid = useMemo(
    () => emailTrim.includes("@") && emailTrim.includes(".") && !busy,
    [emailTrim, busy]
  );

  const successMsg = "If an account exists for that email, you’ll receive a reset link shortly.";

  const onSubmit = async () => {
    if (!valid) return;
    setMsg(null);
    setBusy(true);

    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        json: { email: emailTrim },
      });

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMsg(successMsg);
    } catch {
      // Same message to avoid user enumeration
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMsg(successMsg);
    } finally {
      setBusy(false);
    }
  };

  const inputCardStyle = {
    backgroundColor: withAlpha(t.color.surface, 0.96),
    borderWidth: 1,
    borderColor: focused ? withAlpha(t.color.text, 0.35) : withAlpha(t.color.border, 0.95),
    borderRadius: t.radius.xl,
    paddingHorizontal: t.space[16],
    paddingVertical: 14,
  };

  const primaryButtonStyle = (pressed: boolean) => ({
    marginTop: 8,
    height: 52,
    borderRadius: t.radius.pill,
    backgroundColor: valid ? t.color.accent : withAlpha(t.color.border, 1),
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
    gap: 10,
    opacity: pressed ? 0.95 : 1,
    borderWidth: 1,
    borderColor: valid ? "rgba(255,255,255,0.18)" : withAlpha(t.color.border, 1),
    shadowOpacity: valid ? 0.18 : 0,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: valid ? 6 : 0,
  });

  const secondaryButtonStyle = (pressed: boolean) => ({
    height: 52,
    borderRadius: t.radius.pill,
    backgroundColor: withAlpha(t.color.surface, 0.78),
    borderWidth: 1,
    borderColor: withAlpha(t.color.border, 0.95),
    alignItems: "center" as const,
    justifyContent: "center" as const,
    opacity: pressed ? 0.92 : 1,
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={{ flex: 1, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 16 }}>
        <View style={{ paddingHorizontal: t.space[16], marginTop: 6 }}>
          <AppText
            variant="title"
            weight="semibold"
            style={{ fontSize: 36, lineHeight: 40, letterSpacing: -1.1 }}
          >
            Reset password
          </AppText>

          <AppText variant="muted" weight="regular" style={{ marginTop: 8, lineHeight: t.line.sm }}>
            We’ll email you a link to set a new password.
          </AppText>
        </View>

        <View style={{ paddingHorizontal: t.space[16], marginTop: 18, gap: 12 }}>
          {/* Email */}
          <View style={inputCardStyle}>
            <AppText variant="label" weight="medium" style={{ color: t.color.textMuted, fontSize: t.text.sm }}>
              Email
            </AppText>

            <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(t.color.surfaceAlt, 0.92),
                  borderWidth: 1,
                  borderColor: withAlpha(t.color.border, 0.95),
                }}
              >
                <Ionicons name="mail-outline" size={18} color={t.color.textMuted} />
              </View>

              <TextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={onSubmit}
                placeholder="you@example.com"
                placeholderTextColor={withAlpha(t.color.textMuted, 0.65)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                  flex: 1,
                  color: t.color.text,
                  fontSize: t.text.md,
                  fontWeight: "600",
                  letterSpacing: -0.15,
                  paddingVertical: 6,
                }}
              />
            </View>

            <AppText
              variant="label"
              weight="regular"
              style={{ marginTop: 8, color: t.color.textMuted, fontSize: t.text.xs }}
            >
              We won’t reveal whether an account exists.
            </AppText>
          </View>

          {/* Status */}
          {msg ? (
            <View
              style={{
                borderRadius: t.radius.xl,
                borderWidth: 1,
                borderColor: withAlpha(t.color.border, 0.95),
                backgroundColor: withAlpha(t.color.surfaceAlt, 0.65),
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color={t.color.sage ?? "#2F7D6D"} style={{ marginTop: 2 }} />
              <AppText variant="muted" weight="regular" style={{ flex: 1, lineHeight: t.line.sm }}>
                {msg}
              </AppText>
            </View>
          ) : null}

          {/* CTA */}
          <Pressable onPress={onSubmit} disabled={!valid} style={({ pressed }) => primaryButtonStyle(pressed)}>
            {busy ? <ActivityIndicator /> : null}
            <AppText
              variant="button"
              weight="semibold"
              style={{
                color: valid ? t.color.textOnAccent : t.color.textMuted,
                fontSize: t.text.md,
              }}
            >
              {busy ? "Sending..." : "Send reset link"}
            </AppText>
          </Pressable>

          {/* Back */}
          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={({ pressed }) => secondaryButtonStyle(pressed)}
          >
            <AppText variant="button" weight="semibold" style={{ color: t.color.text, fontSize: t.text.md }}>
              Back to sign in
            </AppText>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
