// app/sign-up.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { signIn, signUp } from "../src/lib/authApi";
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

function sanitizeUsername(raw: string) {
  return (raw ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function passwordChecks(pw: string) {
  const s = pw ?? "";
  return {
    min: s.length >= 8,
    lower: /[a-z]/.test(s),
    upper: /[A-Z]/.test(s),
    number: /[0-9]/.test(s),
    special: /[^A-Za-z0-9]/.test(s),
  };
}

type AvailState = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

async function checkAvailability(kind: "username" | "email", value: string) {
  const q = `?kind=${encodeURIComponent(kind)}&value=${encodeURIComponent(value)}`;
  return apiFetch<{ available: boolean; reason?: string }>(`/api/auth/check${q}`, { method: "GET" });
}

function StatusRow({
  state,
  okText,
  badText,
}: {
  state: AvailState;
  okText: string;
  badText: string;
}) {
  const { t } = useTheme();

  if (state === "idle") return null;

  const icon =
    state === "checking"
      ? null
      : state === "available"
      ? "checkmark-circle"
      : state === "taken" || state === "invalid" || state === "error"
      ? "close-circle"
      : null;

  const text =
    state === "checking"
      ? "Checking…"
      : state === "available"
      ? okText
      : state === "taken"
      ? badText
      : state === "invalid"
      ? "Invalid"
      : state === "error"
      ? "Couldn’t check"
      : "";

  const color =
    state === "available"
      ? (t.color.sage ?? "#2F7D6D")
      : state === "taken" || state === "invalid" || state === "error"
      ? "#B42318"
      : t.color.textMuted;

  return (
    <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
      {state === "checking" ? (
        <ActivityIndicator />
      ) : icon ? (
        <Ionicons name={icon as any} size={16} color={color} />
      ) : null}

      <AppText variant="muted" weight="regular" style={{ color, lineHeight: t.line.sm }}>
        {text}
      </AppText>
    </View>
  );
}

function RuleRow({ ok, label }: { ok: boolean; label: string }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
      <Ionicons
        name={ok ? "checkmark-circle" : "ellipse-outline"}
        size={16}
        color={ok ? (t.color.sage ?? "#2F7D6D") : withAlpha(t.color.textMuted, 0.65)}
      />
      <AppText
        variant="label"
        weight="regular"
        style={{
          color: ok ? t.color.text : t.color.textMuted,
          fontSize: t.text.xs,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

export default function SignUpScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [userFocused, setUserFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const usernameClean = useMemo(() => sanitizeUsername(username.trim()), [username]);
  const emailTrim = useMemo(() => email.trim().toLowerCase(), [email]);

  const usernameFormatOk = useMemo(() => {
    if (usernameClean.length < 3 || usernameClean.length > 20) return false;
    return /^[a-z0-9_]+$/.test(usernameClean);
  }, [usernameClean]);

  const emailFormatOk = useMemo(() => emailTrim.includes("@") && emailTrim.includes("."), [emailTrim]);

  const pw = useMemo(() => passwordChecks(password), [password]);
  const passwordOk = pw.min && pw.lower && pw.upper && pw.number && pw.special;

  // Availability states (debounced)
  const [userAvail, setUserAvail] = useState<AvailState>("idle");
  const [emailAvail, setEmailAvail] = useState<AvailState>("idle");

  useEffect(() => {
    let timer: any;

    if (!usernameClean) {
      setUserAvail("idle");
      return;
    }

    if (!usernameFormatOk) {
      setUserAvail("invalid");
      return;
    }

    setUserAvail("checking");
    timer = setTimeout(async () => {
      try {
        const res = await checkAvailability("username", usernameClean);
        setUserAvail(res.available ? "available" : "taken");
      } catch {
        setUserAvail("error");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [usernameClean, usernameFormatOk]);

  useEffect(() => {
    let timer: any;

    if (!emailTrim) {
      setEmailAvail("idle");
      return;
    }

    if (!emailFormatOk) {
      setEmailAvail("invalid");
      return;
    }

    setEmailAvail("checking");
    timer = setTimeout(async () => {
      try {
        const res = await checkAvailability("email", emailTrim);
        setEmailAvail(res.available ? "available" : "taken");
      } catch {
        setEmailAvail("error");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [emailTrim, emailFormatOk]);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!usernameFormatOk || userAvail !== "available") return false;
    if (!emailFormatOk || emailAvail !== "available") return false;
    if (!passwordOk) return false;
    return true;
  }, [busy, usernameFormatOk, userAvail, emailFormatOk, emailAvail, passwordOk]);

  const inputCardStyle = (focused: boolean) => ({
    backgroundColor: withAlpha(t.color.surface, 0.96),
    borderWidth: 1,
    borderColor: focused ? withAlpha(t.color.text, 0.35) : withAlpha(t.color.border, 0.95),
    borderRadius: t.radius.xl,
    paddingHorizontal: t.space[16],
    paddingVertical: 14,
  });

  const primaryButtonStyle = (pressed: boolean) => ({
    marginTop: 8,
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

  const onSubmit = async () => {
    if (!canSubmit) return;

    setError(null);
    setBusy(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await signUp({ username: usernameClean, email: emailTrim, password });
      await signIn({ email: emailTrim, password });

      router.replace("/" as any);
    } catch (e: any) {
      setError(e?.message ?? "Sign up failed");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={{ flex: 1, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 16 }}>
        {/* Title */}
        <View style={{ paddingHorizontal: t.space[16], marginTop: 6 }}>
          <AppText
            variant="title"
            weight="semibold"
            style={{ fontSize: 36, lineHeight: 40, letterSpacing: -1.1 }}
          >
            Create account
          </AppText>

          <AppText variant="muted" weight="regular" style={{ marginTop: 8, lineHeight: t.line.sm }}>
            Just email + password. No social logins.
          </AppText>
        </View>

        {/* Form */}
        <View style={{ paddingHorizontal: t.space[16], marginTop: 18, gap: 12 }}>
          {/* Username */}
          <View style={inputCardStyle(userFocused)}>
            <AppText variant="label" weight="medium" style={{ color: t.color.textMuted, fontSize: t.text.sm }}>
              Username
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
                <Ionicons name="at-outline" size={18} color={t.color.textMuted} />
              </View>

              <TextInput
                ref={userRef}
                value={username}
                onChangeText={(v) => setUsername(sanitizeUsername(v))}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                placeholder="e.g. nippy_01"
                placeholderTextColor={withAlpha(t.color.textMuted, 0.65)}
                onFocus={() => setUserFocused(true)}
                onBlur={() => setUserFocused(false)}
                style={{
                  flex: 1,
                  color: t.color.text,
                  fontSize: t.text.md,
                  fontWeight: "600", // ✅ keep inputs calm
                  letterSpacing: -0.15,
                  paddingVertical: 6,
                }}
              />
            </View>

            <AppText variant="label" weight="regular" style={{ marginTop: 8, color: t.color.textMuted, fontSize: t.text.xs }}>
              3–20 chars. Letters, numbers, underscore.
            </AppText>

            <StatusRow state={userAvail} okText="Username available" badText="Username taken" />
          </View>

          {/* Email */}
          <View style={inputCardStyle(emailFocused)}>
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
                  fontWeight: "600",
                  letterSpacing: -0.15,
                  paddingVertical: 6,
                }}
              />
            </View>

            <StatusRow state={emailAvail} okText="Email available" badText="Email already in use" />
          </View>

          {/* Password */}
          <View style={inputCardStyle(passFocused)}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <AppText variant="label" weight="medium" style={{ color: t.color.textMuted, fontSize: t.text.sm }}>
                Password
              </AppText>

              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPassword((v) => !v);
                }}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
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
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={t.color.textMuted} />
                </View>
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
                placeholder="Create a strong password"
                placeholderTextColor={withAlpha(t.color.textMuted, 0.65)}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                style={{
                  flex: 1,
                  color: t.color.text,
                  fontSize: t.text.md,
                  fontWeight: "600",
                  letterSpacing: -0.1,
                  paddingVertical: 6,
                }}
              />
            </View>

            <View style={{ marginTop: 10 }}>
              <RuleRow ok={pw.min} label="At least 8 characters" />
              <RuleRow ok={pw.upper} label="One uppercase letter" />
              <RuleRow ok={pw.lower} label="One lowercase letter" />
              <RuleRow ok={pw.number} label="One number" />
              <RuleRow ok={pw.special} label="One special character" />
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View
              style={{
                borderRadius: t.radius.xl,
                borderWidth: 1,
                borderColor: "rgba(180,35,24,0.25)",
                backgroundColor: "rgba(180,35,24,0.08)",
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <Ionicons name="alert-circle" size={18} color="#B42318" style={{ marginTop: 2 }} />
              <AppText variant="muted" weight="regular" style={{ flex: 1, color: "#B42318", lineHeight: t.line.sm }}>
                {error}
              </AppText>
            </View>
          ) : null}

          {/* Create */}
          <Pressable onPress={onSubmit} disabled={!canSubmit} style={({ pressed }) => primaryButtonStyle(pressed)}>
            {busy ? <ActivityIndicator /> : null}
            <AppText
              variant="button"
              weight="semibold"
              style={{ color: canSubmit ? t.color.textOnAccent : t.color.textMuted, fontSize: t.text.md }}
            >
              {busy ? "Creating..." : "Create account"}
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
              I already have an account
            </AppText>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
