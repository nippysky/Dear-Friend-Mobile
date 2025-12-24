// app/sign-in.tsx
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
import { signIn } from "../src/lib/authApi";
import { useTheme } from "../src/theme/ThemeProvider";

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

  const canSubmit = useMemo(
    () => !!email.trim() && password.length >= 8 && !busy,
    [email, password, busy]
  );

  const onSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signIn({ email: email.trim(), password });

      const next = typeof params.next === "string" ? params.next : "/";
      router.replace(next as any);
    } catch (e: any) {
      setError(e?.message ?? "Sign in failed");
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
          Welcome back
        </Text>
        <Text
          style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "600" }}
        >
          Sign in to like, reply, and ask.
        </Text>

        <View style={{ marginTop: 18, gap: 12 }}>
          {/* Email */}
          <View
            style={{
              backgroundColor: t.color.surface,
              borderWidth: 1,
              borderColor: t.color.border,
              borderRadius: t.radius.xl,
              padding: t.space[16],
            }}
          >
            <Text
              style={{
                color: t.color.textMuted,
                fontSize: t.text.sm,
                fontWeight: "700",
              }}
            >
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
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

          {/* Password */}
          <View
            style={{
              backgroundColor: t.color.surface,
              borderWidth: 1,
              borderColor: t.color.border,
              borderRadius: t.radius.xl,
              padding: t.space[16],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: t.color.textMuted,
                  fontSize: t.text.sm,
                  fontWeight: "700",
                }}
              >
                Password
              </Text>

              {/* ✅ Forgot password link (subtle, clean) */}
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/forgot-password" as any);
                }}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Text
                  style={{
                    color: t.color.accent,
                    fontWeight: "800",
                    fontSize: t.text.sm,
                  }}
                >
                  Forgot?
                </Text>
              </Pressable>
            </View>

            <TextInput
              ref={passRef}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              placeholder="••••••••"
              placeholderTextColor={t.color.textMuted}
              style={{
                marginTop: 8,
                color: t.color.text,
                fontSize: t.text.md,
                fontWeight: "700",
              }}
            />
          </View>

          {error ? (
            <Text style={{ color: "#B42318", fontWeight: "800" }}>
              {error}
            </Text>
          ) : null}

          {/* CTA */}
          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => ({
              marginTop: 4,
              paddingVertical: 14,
              borderRadius: t.radius.pill,
              backgroundColor: canSubmit ? t.color.accent : t.color.border,
              alignItems: "center",
              opacity: pressed ? 0.95 : 1,
            })}
          >
            <Text
              style={{
                color: t.color.textOnAccent,
                fontWeight: "900",
                fontSize: t.text.md,
              }}
            >
              {busy ? "Signing in..." : "Sign in"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/sign-up" as any)}
            style={{ alignItems: "center", paddingVertical: 10 }}
          >
            <Text style={{ color: t.color.accent, fontWeight: "900" }}>
              Create an account
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/" as any)}
            style={{ alignItems: "center", paddingVertical: 6 }}
          >
            <Text style={{ color: t.color.textMuted, fontWeight: "800" }}>
              Continue browsing
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
