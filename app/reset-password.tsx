// app/reset-password.tsx
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

function passwordChecks(pw: string) {
  const s = pw ?? "";
  return {
    len: s.length >= 8,
    upper: /[A-Z]/.test(s),
    lower: /[a-z]/.test(s),
    special: /[^A-Za-z0-9]/.test(s),
  };
}

function CheckRow({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
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

export default function ResetPassword() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    type?: string;
    expires_in?: string;
  }>();

  const accessToken = typeof params.access_token === "string" ? params.access_token : "";

  const confirmRef = useRef<TextInput>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [pwFocused, setPwFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const checks = useMemo(() => passwordChecks(newPassword), [newPassword]);

  const linkInvalid = !accessToken;

  const valid = useMemo(() => {
    if (!accessToken) return false;
    if (busy) return false;
    if (!(checks.len && checks.upper && checks.lower && checks.special)) return false;
    if (newPassword.trim() !== confirm.trim()) return false;
    return true;
  }, [accessToken, busy, checks, newPassword, confirm]);

  const onSubmit = async () => {
    if (!valid) return;
    setMsg(null);
    setBusy(true);

    try {
      await apiFetch("/api/auth/update-password", {
        method: "POST",
        json: { newPassword: newPassword.trim() },
        headers: { Authorization: `Bearer ${accessToken}` },
      } as any);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMsg("Password updated. Please sign in.");
      setNewPassword("");
      setConfirm("");

      router.replace("/sign-in" as any);
    } catch (e: any) {
      setMsg(e?.message ?? "Couldn’t update password.");
    } finally {
      setBusy(false);
    }
  };

  const inputCard = (focused: boolean) => ({
    backgroundColor: withAlpha(t.color.surface, 0.96),
    borderWidth: 1,
    borderColor: focused ? withAlpha(t.color.text, 0.35) : withAlpha(t.color.border, 0.95),
    borderRadius: t.radius.xl,
    paddingHorizontal: t.space[16],
    paddingVertical: 14,
  });

  const primaryButtonStyle = (pressed: boolean) => ({
    marginTop: 10,
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
    marginTop: 10,
    height: 52,
    borderRadius: t.radius.pill,
    backgroundColor: withAlpha(t.color.surface, 0.78),
    borderWidth: 1,
    borderColor: withAlpha(t.color.border, 0.95),
    alignItems: "center" as const,
    justifyContent: "center" as const,
    opacity: pressed ? 0.92 : 1,
    flexDirection: "row" as const,
    gap: 10,
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={{ flex: 1, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 16 }}>
        <View style={{ paddingHorizontal: t.space[16], marginTop: 6 }}>
          <Text style={{ fontSize: 36, lineHeight: 40, fontWeight: "900", color: t.color.text, letterSpacing: -1.1 }}>
            Set new password
          </Text>
          <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "700", lineHeight: 20 }}>
            Use a strong password you can still remember.
          </Text>
        </View>

        <View style={{ paddingHorizontal: t.space[16], marginTop: 18, gap: 12 }}>
          {linkInvalid ? (
            <View
              style={{
                borderRadius: t.radius.xl,
                borderWidth: 1,
                borderColor: withAlpha(t.color.border, 0.95),
                backgroundColor: withAlpha(t.color.surfaceAlt, 0.65),
                padding: t.space[16],
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="alert-circle" size={18} color="#B42318" />
                <Text style={{ color: t.color.text, fontWeight: "900" }}>
                  This reset link is invalid or expired.
                </Text>
              </View>
              <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "800", lineHeight: 20 }}>
                Go back and request a new one.
              </Text>

              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.replace("/forgot-password" as any);
                }}
                style={({ pressed }) => secondaryButtonStyle(pressed)}
              >
                <Ionicons name="mail-outline" size={18} color={t.color.text} />
                <Text style={{ color: t.color.text, fontWeight: "900", fontSize: t.text.md }}>
                  Request new link
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* New password */}
              <View style={inputCard(pwFocused)}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: t.color.textMuted, fontSize: t.text.sm, fontWeight: "800" }}>
                    New password
                  </Text>

                  <Pressable
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowPw((v) => !v);
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
                      <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={t.color.textMuted} />
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
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPw}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    placeholder="8+ characters"
                    placeholderTextColor={withAlpha(t.color.textMuted, 0.65)}
                    onFocus={() => setPwFocused(true)}
                    onBlur={() => setPwFocused(false)}
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

                <View style={{ marginTop: 10, gap: 6 }}>
                  <CheckRow ok={checks.len} label="At least 8 characters" />
                  <CheckRow ok={checks.upper} label="One uppercase letter" />
                  <CheckRow ok={checks.lower} label="One lowercase letter" />
                  <CheckRow ok={checks.special} label="One special character" />
                </View>
              </View>

              {/* Confirm */}
              <View style={inputCard(confirmFocused)}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: t.color.textMuted, fontSize: t.text.sm, fontWeight: "800" }}>
                    Confirm password
                  </Text>

                  <Pressable
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowConfirm((v) => !v);
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
                      <Ionicons
                        name={showConfirm ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color={t.color.textMuted}
                      />
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
                    <Ionicons name="key-outline" size={18} color={t.color.textMuted} />
                  </View>

                  <TextInput
                    ref={confirmRef}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!showConfirm}
                    returnKeyType="go"
                    onSubmitEditing={onSubmit}
                    placeholder="Repeat new password"
                    placeholderTextColor={withAlpha(t.color.textMuted, 0.65)}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
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

                {confirm.length > 0 ? (
                  <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons
                      name={newPassword.trim() === confirm.trim() ? "checkmark-circle" : "close-circle"}
                      size={16}
                      color={newPassword.trim() === confirm.trim() ? "#2F7D6D" : "#B42318"}
                    />
                    <Text style={{ color: t.color.textMuted, fontWeight: "800", fontSize: t.text.xs }}>
                      {newPassword.trim() === confirm.trim() ? "Passwords match" : "Passwords don’t match"}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Message */}
              {msg ? (
                <View
                  style={{
                    borderRadius: t.radius.xl,
                    borderWidth: 1,
                    borderColor: withAlpha(t.color.border, 0.95),
                    backgroundColor: msg.toLowerCase().includes("updated")
                      ? withAlpha(t.color.surfaceAlt, 0.65)
                      : withAlpha(t.color.surfaceAlt, 0.65),
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <Ionicons
                    name={msg.toLowerCase().includes("updated") ? "checkmark-circle" : "alert-circle"}
                    size={18}
                    color={msg.toLowerCase().includes("updated") ? "#2F7D6D" : "#B42318"}
                    style={{ marginTop: 2 }}
                  />
                  <Text style={{ flex: 1, color: t.color.textMuted, fontWeight: "900", lineHeight: 20 }}>
                    {msg}
                  </Text>
                </View>
              ) : null}

              {/* CTA */}
              <Pressable onPress={onSubmit} disabled={!valid} style={({ pressed }) => primaryButtonStyle(pressed)}>
                {busy ? <ActivityIndicator /> : null}
                <Text
                  style={{
                    color: valid ? t.color.textOnAccent : t.color.textMuted,
                    fontWeight: "900",
                    fontSize: t.text.md,
                  }}
                >
                  {busy ? "Updating..." : "Update password"}
                </Text>
              </Pressable>

              {/* Back */}
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.replace("/sign-in" as any);
                }}
                style={({ pressed }) => secondaryButtonStyle(pressed)}
              >
                <Ionicons name="log-in-outline" size={18} color={t.color.text} />
                <Text style={{ color: t.color.text, fontWeight: "900", fontSize: t.text.md }}>
                  Back to sign in
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
