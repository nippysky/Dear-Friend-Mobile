// app/profile/password.tsx
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch } from "../../src/lib/api";
import { requireAuth } from "../../src/lib/requireAuth";
import { useTheme } from "../../src/theme/ThemeProvider";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const { t } = useTheme();

  return (
    <View
      style={{
        backgroundColor: t.color.surfaceAlt,
        borderWidth: 1,
        borderColor: t.color.border,
        borderRadius: t.radius.xl,
        padding: t.space[12], // ✅ token exists
      }}
    >
      <Text style={{ color: t.color.textMuted, fontSize: t.text.sm, fontWeight: "800" }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        placeholder={placeholder}
        placeholderTextColor={t.color.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          marginTop: 8,
          color: t.color.text,
          fontSize: t.text.md,
          fontWeight: "700",
        }}
        returnKeyType="done"
      />
    </View>
  );
}

export default function ChangePasswordScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const valid = useMemo(() => {
    const cur = currentPassword.trim();
    const next = newPassword.trim();
    const conf = confirm.trim();

    if (!cur) return false;
    if (next.length < 8) return false;
    if (next !== conf) return false;
    if (next === cur) return false;
    return true;
  }, [currentPassword, newPassword, confirm]);

  const onSubmit = async () => {
    setMsg(null);
    Keyboard.dismiss();

    const ok = await requireAuth("/profile/password");
    if (!ok) return;

    setBusy(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        json: { currentPassword: currentPassword.trim(), newPassword: newPassword.trim() },
      });

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMsg("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (e: any) {
      setMsg(e?.message ?? "Couldn’t update password.");
    } finally {
      setBusy(false);
    }
  };

  const isSuccess = msg === "Password updated.";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }} accessible={false}>
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 18,
            paddingHorizontal: t.space[16],
          }}
        >
          {/* Top bar */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={({ pressed }) => ({ paddingVertical: 8, paddingRight: 10, opacity: pressed ? 0.85 : 1 })}
            >
              <Text style={{ color: t.color.textMuted, fontWeight: "900" }}>Back</Text>
            </Pressable>

            <Text style={{ color: t.color.text, fontWeight: "900", fontSize: t.text.lg, letterSpacing: -0.4 }}>
              Password
            </Text>

            <View style={{ width: 44 }} />
          </View>

          <Text style={{ marginTop: 6, color: t.color.textMuted, fontWeight: "700" }}>
            Use 8+ characters. Don’t reuse your current password.
          </Text>

          {/* Card */}
          <View
            style={{
              marginTop: 14,
              backgroundColor: t.color.surface,
              borderWidth: 1,
              borderColor: t.color.border,
              borderRadius: t.radius.xl,
              padding: t.space[16],
              gap: 12,
            }}
          >
            <Field
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="••••••••"
            />
            <Field
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="8+ characters"
            />
            <Field
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat new password"
            />

            {msg ? (
              <Text style={{ marginTop: 2, color: isSuccess ? t.color.accent : "#B42318", fontWeight: "800" }}>
                {msg}
              </Text>
            ) : null}

            <Pressable
              onPress={onSubmit}
              disabled={!valid || busy}
              style={({ pressed }) => ({
                marginTop: 2,
                paddingVertical: 14,
                borderRadius: t.radius.pill,
                backgroundColor: valid && !busy ? t.color.accent : t.color.border,
                alignItems: "center",
                opacity: pressed && valid ? 0.9 : 1,
              })}
            >
              <Text style={{ color: t.color.textOnAccent, fontWeight: "900" }}>
                {busy ? "Updating..." : "Update password"}
              </Text>
            </Pressable>

            <Text style={{ marginTop: 6, color: t.color.textMuted, fontWeight: "700" }}>
              Forgot password? Coming next.
            </Text>
          </View>
        </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
