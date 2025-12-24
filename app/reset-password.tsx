// app/reset-password.tsx
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
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

  const valid = useMemo(() => {
    if (!accessToken) return false;
    if (newPassword.trim().length < 8) return false;
    if (newPassword.trim() !== confirm.trim()) return false;
    if (busy) return false;
    return true;
  }, [accessToken, newPassword, confirm, busy]);

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

  const linkInvalid = !accessToken;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: t.space[16],
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 18,
        }}
      >
        <Text
          style={{
            fontSize: t.text["2xl"],
            fontWeight: "900",
            color: t.color.text,
            letterSpacing: -0.8,
          }}
        >
          Set new password
        </Text>

        <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "600" }}>
          Use 8+ characters. Keep it memorable, not obvious.
        </Text>

        <View style={{ marginTop: 18, gap: 12 }}>
          {linkInvalid ? (
            <View
              style={{
                backgroundColor: t.color.surfaceAlt,
                borderWidth: 1,
                borderColor: t.color.border,
                borderRadius: t.radius.xl,
                padding: t.space[16],
              }}
            >
              <Text style={{ color: t.color.text, fontWeight: "800" }}>
                This reset link is invalid or expired.
              </Text>
              <Text style={{ marginTop: 6, color: t.color.textMuted, fontWeight: "700" }}>
                Go back and request a new one.
              </Text>

              <Pressable
                onPress={() => router.replace("/forgot-password" as any)}
                style={({ pressed }) => ({
                  marginTop: 12,
                  paddingVertical: 12,
                  borderRadius: t.radius.pill,
                  backgroundColor: t.color.surface,
                  borderWidth: 1,
                  borderColor: t.color.border,
                  alignItems: "center",
                  opacity: pressed ? 0.95 : 1,
                })}
              >
                <Text style={{ color: t.color.text, fontWeight: "900" }}>Request new link</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View
                style={{
                  backgroundColor: t.color.surface,
                  borderWidth: 1,
                  borderColor: t.color.border,
                  borderRadius: t.radius.xl,
                  padding: t.space[16],
                }}
              >
                <Text style={{ color: t.color.textMuted, fontSize: t.text.sm, fontWeight: "700" }}>
                  New password
                </Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  placeholder="8+ characters"
                  placeholderTextColor={t.color.textMuted}
                  style={{
                    marginTop: 8,
                    color: t.color.text,
                    fontSize: t.text.md,
                    fontWeight: "700",
                  }}
                />
              </View>

              <View
                style={{
                  backgroundColor: t.color.surface,
                  borderWidth: 1,
                  borderColor: t.color.border,
                  borderRadius: t.radius.xl,
                  padding: t.space[16],
                }}
              >
                <Text style={{ color: t.color.textMuted, fontSize: t.text.sm, fontWeight: "700" }}>
                  Confirm
                </Text>
                <TextInput
                  ref={confirmRef}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                  placeholder="Repeat new password"
                  placeholderTextColor={t.color.textMuted}
                  style={{
                    marginTop: 8,
                    color: t.color.text,
                    fontSize: t.text.md,
                    fontWeight: "700",
                  }}
                />
              </View>

              {msg ? (
                <View
                  style={{
                    backgroundColor: msg.toLowerCase().includes("updated")
                      ? t.color.accentSoft
                      : t.color.surfaceAlt,
                    borderWidth: 1,
                    borderColor: t.color.border,
                    borderRadius: t.radius.xl,
                    padding: t.space[16],
                  }}
                >
                  <Text
                    style={{
                      color: msg.toLowerCase().includes("updated") ? t.color.text : "#B42318",
                      fontWeight: "800",
                    }}
                  >
                    {msg}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={onSubmit}
                disabled={!valid}
                style={({ pressed }) => ({
                  marginTop: 4,
                  paddingVertical: 14,
                  borderRadius: t.radius.pill,
                  backgroundColor: valid ? t.color.accent : t.color.border,
                  alignItems: "center",
                  opacity: pressed ? 0.95 : 1,
                })}
              >
                <Text style={{ color: t.color.textOnAccent, fontWeight: "900", fontSize: t.text.md }}>
                  {busy ? "Updating..." : "Update password"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
