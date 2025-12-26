// app/sign-in.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signIn } from "../src/lib/authApi";
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

export default function SignIn() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ next?: string }>();

  const passRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const emailTrim = email.trim();

  const canSubmit = useMemo(() => {
    const okEmail = !!emailTrim;
    const okPass = password.length >= 8;
    return okEmail && okPass && !busy;
  }, [emailTrim, password, busy]);

  const onSubmit = async () => {
    if (!canSubmit) return;

    setError(null);
    setBusy(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signIn({ email: emailTrim, password });

      const next = typeof params.next === "string" ? params.next : "/";
      router.replace(next as any);
    } catch (e: any) {
      setError(e?.message ?? "Sign in failed");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  const inputCardStyle = (focused: boolean) => ({
    backgroundColor: withAlpha(t.color.surface, 0.96),
    borderWidth: 1,
    borderColor: focused ? withAlpha(t.color.text, 0.35) : withAlpha(t.color.border, 0.95),
    borderRadius: t.radius.xl,
    paddingHorizontal: t.space[16],
    paddingVertical: 14,
  });

  const labelStyle = {
    color: t.color.textMuted,
    fontSize: t.text.sm,
    fontWeight: "800" as const,
    letterSpacing: -0.1,
  };

  const primaryButtonStyle = (pressed: boolean) => ({
    marginTop: 4,
    height: 52,
    borderRadius: t.radius.pill,
    backgroundColor: canSubmit ? t.color.accent : withAlpha(t.color.border, 1),
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
    gap: 10,
    opacity: pressed ? 0.95 : 1,
    borderWidth: 1,
    borderColor: canSubmit ? "rgba(255,255,255,0.18)" : withAlpha(t.color.border, 1),
    shadowOpacity: canSubmit ? 0.18 : 0,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: canSubmit ? 6 : 0,
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
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 16,
        }}
      >
        {/* Title */}
        <View style={{ paddingHorizontal: t.space[16], marginTop: 6 }}>
          <Text
            style={{
              fontSize: 38,
              lineHeight: 42,
              fontWeight: "900",
              color: t.color.text,
              letterSpacing: -1.1,
            }}
          >
            Welcome back
          </Text>
          <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "700", lineHeight: 20 }}>
            Sign in to like, reply, and ask.
          </Text>
        </View>

        {/* Form */}
        <View style={{ paddingHorizontal: t.space[16], marginTop: 18, gap: 12 }}>
          {/* Email */}
          <View style={inputCardStyle(emailFocused)}>
            <Text style={labelStyle}>Email</Text>

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
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
                placeholder="you@example.com"
                placeholderTextColor={withAlpha(t.color.textMuted, 0.65)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                style={{
                  flex: 1,
                  color: t.color.text,
                  fontSize: t.text.md,
                  fontWeight: "800",
                  letterSpacing: -0.2,
                  paddingVertical: 6,
                }}
              />
            </View>
          </View>

          {/* Password */}
          <View style={inputCardStyle(passFocused)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={labelStyle}>Password</Text>

              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/forgot-password" as any);
                }}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Text style={{ color: t.color.accent, fontWeight: "900", fontSize: t.text.sm }}>Forgot?</Text>
              </Pressable>
            </View>

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
                <Ionicons name="lock-closed-outline" size={18} color={t.color.textMuted} />
              </View>

              <TextInput
                ref={passRef}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                placeholder="••••••••"
                placeholderTextColor={withAlpha(t.color.textMuted, 0.65)}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                style={{
                  flex: 1,
                  color: t.color.text,
                  fontSize: t.text.md,
                  fontWeight: "900",
                  letterSpacing: 0.2,
                  paddingVertical: 6,
                }}
              />

              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPassword((v) => !v);
                }}
                hitSlop={12}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(t.color.surface, 0.9),
                  borderWidth: 1,
                  borderColor: withAlpha(t.color.border, 0.95),
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={t.color.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(180,35,24,0.25)",
                backgroundColor: "rgba(180,35,24,0.08)",
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: "#B42318", fontWeight: "900" }}>{error}</Text>
            </View>
          ) : null}

          {/* Primary CTA */}
          <Pressable onPress={onSubmit} disabled={!canSubmit} style={({ pressed }) => primaryButtonStyle(pressed)}>
            {busy ? <ActivityIndicator /> : null}
            <Text
              style={{
                color: canSubmit ? t.color.textOnAccent : t.color.textMuted,
                fontWeight: "900",
                fontSize: t.text.md,
              }}
            >
              {busy ? "Signing in..." : "Sign in"}
            </Text>
          </Pressable>

          {/* Secondary CTA (same size as primary) */}
          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/sign-up" as any);
            }}
            style={({ pressed }) => secondaryButtonStyle(pressed)}
          >
            <Text style={{ color: t.color.text, fontWeight: "900", fontSize: t.text.md }}>Create an account</Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace("/" as any);
            }}
            style={({ pressed }) => ({
              alignItems: "center",
              paddingVertical: 10,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: t.color.textMuted, fontWeight: "900" }}>Continue browsing</Text>
          </Pressable>

          <View style={{ height: 8 }} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
