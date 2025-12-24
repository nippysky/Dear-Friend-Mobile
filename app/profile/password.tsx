// app/profile/password.tsx
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

  const validation = useMemo(() => {
    if (nextPw.length > 0 && nextPw.length < 8) return "New password must be at least 8 characters.";
    if (nextPw && confirmPw && nextPw !== confirmPw) return "Passwords don’t match.";
    if (currentPw && nextPw && currentPw === nextPw) return "New password must be different.";
    return null;
  }, [currentPw, nextPw, confirmPw]);

  const canSubmit =
    currentPw.trim().length >= 1 &&
    nextPw.trim().length >= 8 &&
    confirmPw.trim().length >= 8 &&
    !validation;

  const changePassword = useMutation({
    mutationFn: async () => {
      // 🔧 Change this if your API route name differs
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
    >
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: t.space[16] }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => ({ paddingVertical: 8, paddingRight: 10, opacity: pressed ? 0.85 : 1 })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="chevron-back" size={18} color={t.color.textMuted} />
              <Text style={{ color: t.color.textMuted, fontWeight: "700" }}>Back</Text>
            </View>
          </Pressable>

          <Text style={{ color: t.color.text, fontWeight: "800", fontSize: t.text.md, letterSpacing: -0.2 }}>
            Change password
          </Text>

          <View style={{ width: 44 }} />
        </View>

        {/* Signed-in card */}
        <View
          style={{
            marginTop: 12,
            backgroundColor: t.color.surface,
            borderWidth: 1,
            borderColor: t.color.border,
            borderRadius: t.radius.xl,
            padding: 14,
          }}
        >
          {meLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <Text style={{ color: t.color.textMuted, fontWeight: "700" }}>Signed in as</Text>
              <Text style={{ marginTop: 6, color: t.color.text, fontWeight: "900" }}>
                @{username === "—" ? "—" : username}
              </Text>
              <Text style={{ marginTop: 2, color: t.color.textMuted, fontWeight: "700" }}>{email}</Text>
            </>
          )}
        </View>

        {/* Form */}
        <View
          style={{
            marginTop: 12,
            backgroundColor: t.color.surface,
            borderWidth: 1,
            borderColor: t.color.border,
            borderRadius: t.radius.xl,
            padding: 14,
          }}
        >
          <Text style={{ color: t.color.text, fontWeight: "900" }}>Update your password</Text>

          {/* Current */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: t.color.textMuted, fontWeight: "800", marginBottom: 6 }}>Current password</Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: t.color.border,
                backgroundColor: t.color.surfaceAlt,
                borderRadius: 999,
                paddingHorizontal: 14,
              }}
            >
              <TextInput
                value={currentPw}
                onChangeText={setCurrentPw}
                placeholder="Enter current password"
                placeholderTextColor={t.color.textMuted}
                secureTextEntry={!showCurrent}
                style={{ flex: 1, paddingVertical: 11, color: t.color.text, fontWeight: "700" }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowCurrent((v) => !v)}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, paddingLeft: 10, paddingVertical: 8 })}
              >
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={18} color={t.color.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* New */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: t.color.textMuted, fontWeight: "800", marginBottom: 6 }}>New password</Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: t.color.border,
                backgroundColor: t.color.surfaceAlt,
                borderRadius: 999,
                paddingHorizontal: 14,
              }}
            >
              <TextInput
                value={nextPw}
                onChangeText={setNextPw}
                placeholder="At least 8 characters"
                placeholderTextColor={t.color.textMuted}
                secureTextEntry={!showNext}
                style={{ flex: 1, paddingVertical: 11, color: t.color.text, fontWeight: "700" }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowNext((v) => !v)}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, paddingLeft: 10, paddingVertical: 8 })}
              >
                <Ionicons name={showNext ? "eye-off-outline" : "eye-outline"} size={18} color={t.color.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Confirm */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: t.color.textMuted, fontWeight: "800", marginBottom: 6 }}>Confirm new password</Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: t.color.border,
                backgroundColor: t.color.surfaceAlt,
                borderRadius: 999,
                paddingHorizontal: 14,
              }}
            >
              <TextInput
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Re-enter new password"
                placeholderTextColor={t.color.textMuted}
                secureTextEntry
                style={{ paddingVertical: 11, color: t.color.text, fontWeight: "700" }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {validation ? (
            <Text style={{ marginTop: 10, color: t.color.textMuted, fontWeight: "800" }}>{validation}</Text>
          ) : null}

          {changePassword.isError ? (
            <Text style={{ marginTop: 10, color: t.color.textMuted, fontWeight: "900" }}>
              {(changePassword.error as Error)?.message ?? "Couldn’t update password."}
            </Text>
          ) : null}

          <Pressable
            disabled={!canSubmit || changePassword.isPending}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              changePassword.mutate();
            }}
            style={({ pressed }) => ({
              marginTop: 14,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: canSubmit ? t.color.accent : t.color.border,
              opacity: pressed ? 0.92 : 1,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 10,
            })}
          >
            {changePassword.isPending ? <ActivityIndicator color={t.color.textOnAccent} /> : null}
            <Text style={{ fontWeight: "900", color: t.color.textOnAccent }}>
              {changePassword.isPending ? "Updating…" : "Update password"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
