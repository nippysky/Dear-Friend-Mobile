// app/forgot-password.tsx
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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

export default function ForgotPassword() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const emailRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const valid = useMemo(() => email.trim().includes("@") && !busy, [email, busy]);

  const onSubmit = async () => {
    if (!valid) return;
    setMsg(null);
    setBusy(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        json: { email: email.trim() },
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMsg("If an account exists for that email, you’ll receive a reset link shortly.");
    } catch {
      // same message to avoid user enumeration
      setMsg("If an account exists for that email, you’ll receive a reset link shortly.");
    } finally {
      setBusy(false);
    }
  };

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
          Reset password
        </Text>

        <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "600" }}>
          We’ll email you a link to set a new password.
        </Text>

        <View style={{ marginTop: 18, gap: 12 }}>
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
              Email
            </Text>

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
                backgroundColor: t.color.surfaceAlt,
                borderWidth: 1,
                borderColor: t.color.border,
                borderRadius: t.radius.xl,
                padding: t.space[16],
              }}
            >
              <Text style={{ color: t.color.textMuted, fontWeight: "700" }}>{msg}</Text>
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
              {busy ? "Sending..." : "Send reset link"}
            </Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={{ alignItems: "center", paddingVertical: 10 }}
          >
            <Text style={{ color: t.color.accent, fontWeight: "900" }}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
