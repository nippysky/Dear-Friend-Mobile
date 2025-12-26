// app/profile/password.tsx
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch } from "../../src/lib/api";
import { requireAuth } from "../../src/lib/requireAuth";
import { useTheme } from "../../src/theme/ThemeProvider";

type Me = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
};
type MeResponse = { user: Me };

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

function passwordChecks(pw: string) {
  const s = pw ?? "";
  return {
    len: s.length >= 8,
    upper: /[A-Z]/.test(s),
    lower: /[a-z]/.test(s),
    special: /[^A-Za-z0-9]/.test(s),
  };
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Ionicons
        name={ok ? "checkmark-circle" : "ellipse-outline"}
        size={16}
        color={ok ? "#2F7D6D" : withAlpha(t.color.textMuted, 0.65)}
      />
      <Text style={{ color: t.color.textMuted, fontWeight: "800", fontSize: t.text.xs }}>
        {label}
      </Text>
    </View>
  );
}

export default function ChangePasswordScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [curFocused, setCurFocused] = useState(false);
  const [nextFocused, setNextFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const ok = await requireAuth("/profile/password");
      if (!ok) {
        if (alive) setMeLoading(false);
        return;
      }

      try {
        const data = await apiFetch<MeResponse>("/api/me", { method: "GET" });
        if (alive) setMe(data?.user ?? null);
      } finally {
        if (alive) setMeLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const username = useMemo(() => me?.username?.trim() || "—", [me]);
  const email = useMemo(() => me?.email?.trim() || "—", [me]);

  const checks = useMemo(() => passwordChecks(nextPw), [nextPw]);

  const validation = useMemo(() => {
    if (nextPw.length > 0 && !(checks.len && checks.upper && checks.lower && checks.special)) {
      return "Your new password isn’t strong enough yet.";
    }
    if (nextPw && confirmPw && nextPw !== confirmPw) return "Passwords don’t match.";
    if (currentPw && nextPw && currentPw === nextPw) return "New password must be different.";
    return null;
  }, [currentPw, nextPw, confirmPw, checks]);

  const canSubmit =
    currentPw.trim().length >= 1 &&
    checks.len &&
    checks.upper &&
    checks.lower &&
    checks.special &&
    confirmPw.trim().length >= 1 &&
    nextPw.trim() === confirmPw.trim() &&
    !validation;

  const changePassword = useMutation({
    mutationFn: async () => {
      // Change this path if your API route differs
      return apiFetch<{ ok: boolean }>("/api/auth/change-password", {
        method: "POST",
        json: { currentPassword: currentPw, newPassword: nextPw },
      });
    },
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
  });

  const card = {
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: withAlpha(t.color.border, 0.95),
    backgroundColor: withAlpha(t.color.surface, 0.96),
    padding: 14,
  };

  const inputShell = (focused: boolean) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: focused ? withAlpha(t.color.text, 0.35) : withAlpha(t.color.border, 0.95),
    backgroundColor: withAlpha(t.color.surfaceAlt, 0.75),
    borderRadius: 999,
    paddingHorizontal: 14,
  });

  const iconPill = {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: withAlpha(t.color.surface, 0.8),
    borderWidth: 1,
    borderColor: withAlpha(t.color.border, 0.95),
  };

  const primaryButton = (pressed: boolean) => ({
    marginTop: 14,
    height: 52,
    borderRadius: 999,
    backgroundColor: canSubmit ? t.color.accent : withAlpha(t.color.border, 1),
    opacity: pressed ? 0.95 : 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
    gap: 10,
    borderWidth: 1,
    borderColor: canSubmit ? "rgba(255,255,255,0.18)" : withAlpha(t.color.border, 1),
    shadowOpacity: canSubmit ? 0.18 : 0,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: canSubmit ? 6 : 0,
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingHorizontal: t.space[16],
          paddingBottom: insets.bottom + 24,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={10}
            style={({ pressed }) => ({ paddingVertical: 8, paddingRight: 10, opacity: pressed ? 0.85 : 1 })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="chevron-back" size={18} color={t.color.textMuted} />
              <Text style={{ color: t.color.textMuted, fontWeight: "800" }}>Back</Text>
            </View>
          </Pressable>

          <Text style={{ color: t.color.text, fontWeight: "900", fontSize: t.text.md, letterSpacing: -0.2 }}>
            Change password
          </Text>

          <View style={{ width: 44 }} />
        </View>

        {/* Signed-in card */}
        <View style={card}>
          {meLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <Text style={{ color: t.color.textMuted, fontWeight: "800" }}>Signed in as</Text>
              <Text style={{ marginTop: 6, color: t.color.text, fontWeight: "900" }}>
                @{username === "—" ? "—" : username}
              </Text>
              <Text style={{ marginTop: 2, color: t.color.textMuted, fontWeight: "800" }}>{email}</Text>
            </>
          )}
        </View>

        {/* Form */}
        <View style={card}>
          <Text style={{ color: t.color.text, fontWeight: "900", fontSize: t.text.lg, letterSpacing: -0.2 }}>
            Update your password
          </Text>
          <Text style={{ marginTop: 6, color: t.color.textMuted, fontWeight: "800", lineHeight: 20 }}>
            Strong passwords are boring. That’s how you know they work.
          </Text>

          {/* Current */}
          <View style={{ marginTop: 14 }}>
            <Text style={{ color: t.color.textMuted, fontWeight: "800", marginBottom: 8 }}>
              Current password
            </Text>

            <View style={inputShell(curFocused)}>
              <View style={[iconPill, { marginRight: 10 }]}>
                <Ionicons name="lock-closed-outline" size={18} color={t.color.textMuted} />
              </View>

              <TextInput
                value={currentPw}
                onChangeText={setCurrentPw}
                placeholder="Enter current password"
                placeholderTextColor={withAlpha(t.color.textMuted, 0.65)}
                secureTextEntry={!showCurrent}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  color: t.color.text,
                  fontWeight: "800",
                  letterSpacing: -0.2,
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => nextRef.current?.focus()}
                onFocus={() => setCurFocused(true)}
                onBlur={() => setCurFocused(false)}
              />

              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCurrent((v) => !v);
                }}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, paddingLeft: 10, paddingVertical: 8 })}
              >
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={18} color={t.color.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* New */}
          <View style={{ marginTop: 14 }}>
            <Text style={{ color: t.color.textMuted, fontWeight: "800", marginBottom: 8 }}>
              New password
            </Text>

            <View style={inputShell(nextFocused)}>
              <View style={[iconPill, { marginRight: 10 }]}>
                <Ionicons name="key-outline" size={18} color={t.color.textMuted} />
              </View>

              <TextInput
                ref={nextRef}
                value={nextPw}
                onChangeText={setNextPw}
                placeholder="At least 8 characters"
                placeholderTextColor={withAlpha(t.color.textMuted, 0.65)}
                secureTextEntry={!showNext}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  color: t.color.text,
                  fontWeight: "800",
                  letterSpacing: -0.2,
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                onFocus={() => setNextFocused(true)}
                onBlur={() => setNextFocused(false)}
              />

              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowNext((v) => !v);
                }}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, paddingLeft: 10, paddingVertical: 8 })}
              >
                <Ionicons name={showNext ? "eye-off-outline" : "eye-outline"} size={18} color={t.color.textMuted} />
              </Pressable>
            </View>

            <View style={{ marginTop: 10, gap: 6 }}>
              <CheckRow ok={checks.len} label="At least 8 characters" />
              <CheckRow ok={checks.upper} label="One uppercase letter" />
              <CheckRow ok={checks.lower} label="One lowercase letter" />
              <CheckRow ok={checks.special} label="One special character" />
            </View>
          </View>

          {/* Confirm */}
          <View style={{ marginTop: 14 }}>
            <Text style={{ color: t.color.textMuted, fontWeight: "800", marginBottom: 8 }}>
              Confirm new password
            </Text>

            <View style={inputShell(confirmFocused)}>
              <View style={[iconPill, { marginRight: 10 }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={t.color.textMuted} />
              </View>

              <TextInput
                ref={confirmRef}
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Re-enter new password"
                placeholderTextColor={withAlpha(t.color.textMuted, 0.65)}
                secureTextEntry={!showConfirm}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  color: t.color.text,
                  fontWeight: "800",
                  letterSpacing: -0.2,
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={async () => {
                  if (!canSubmit || changePassword.isPending) return;
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  changePassword.mutate();
                }}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
              />

              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowConfirm((v) => !v);
                }}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, paddingLeft: 10, paddingVertical: 8 })}
              >
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={t.color.textMuted} />
              </Pressable>
            </View>

            {confirmPw.length > 0 ? (
              <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons
                  name={nextPw.trim() === confirmPw.trim() ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color={nextPw.trim() === confirmPw.trim() ? "#2F7D6D" : "#B42318"}
                />
                <Text style={{ color: t.color.textMuted, fontWeight: "800", fontSize: t.text.xs }}>
                  {nextPw.trim() === confirmPw.trim() ? "Passwords match" : "Passwords don’t match"}
                </Text>
              </View>
            ) : null}
          </View>

          {validation ? (
            <Text style={{ marginTop: 12, color: t.color.textMuted, fontWeight: "900" }}>{validation}</Text>
          ) : null}

          {changePassword.isError ? (
            <Text style={{ marginTop: 12, color: "#B42318", fontWeight: "900" }}>
              {(changePassword.error as Error)?.message ?? "Couldn’t update password."}
            </Text>
          ) : null}

          <Pressable
            disabled={!canSubmit || changePassword.isPending}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              changePassword.mutate();
            }}
            style={({ pressed }) => primaryButton(pressed)}
          >
            {changePassword.isPending ? <ActivityIndicator /> : null}
            <Text
              style={{
                fontWeight: "900",
                color: canSubmit ? t.color.textOnAccent : t.color.textMuted,
                fontSize: t.text.md,
              }}
            >
              {changePassword.isPending ? "Updating…" : "Update password"}
            </Text>
          </Pressable>

          <Text style={{ marginTop: 10, color: t.color.textMuted, fontWeight: "800", fontSize: t.text.xs, lineHeight: 18 }}>
            Tip: a passphrase (two random words + symbols) beats “Password123!” every day of the week.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
