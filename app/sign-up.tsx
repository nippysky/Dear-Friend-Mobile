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
import { signIn, signUp } from "../src/lib/authApi";
import { useTheme } from "../src/theme/ThemeProvider";

export default function SignUp() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = useMemo(() => {
    const u = username.trim();
    return (
      u.length >= 3 &&
      /^[a-zA-Z0-9_]+$/.test(u) &&
      email.trim().includes("@") &&
      password.length >= 8 &&
      !busy
    );
  }, [username, email, password, busy]);

  const onSubmit = async () => {
    if (!valid) return;
    setError(null);
    setBusy(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signUp({ username: username.trim(), email: email.trim(), password });
      await signIn({ email: email.trim(), password });
      router.replace("/" as any);
    } catch (e: any) {
      setError(e?.message ?? "Sign up failed");
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
          Create account
        </Text>
        <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "600" }}>
          Just email + password. No social logins.
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
              Username
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              placeholder="e.g. nippy_01"
              placeholderTextColor={t.color.textMuted}
              style={{ marginTop: 8, color: t.color.text, fontSize: t.text.md, fontWeight: "700" }}
            />
            <Text style={{ marginTop: 6, color: t.color.textMuted, fontSize: t.text.xs, fontWeight: "700" }}>
              Letters, numbers, underscore.
            </Text>
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
              Email
            </Text>
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
              placeholderTextColor={t.color.textMuted}
              style={{ marginTop: 8, color: t.color.text, fontSize: t.text.md, fontWeight: "700" }}
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
              Password
            </Text>
            <TextInput
              ref={passRef}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              placeholder="8+ characters"
              placeholderTextColor={t.color.textMuted}
              style={{ marginTop: 8, color: t.color.text, fontSize: t.text.md, fontWeight: "700" }}
            />
          </View>

          {error ? <Text style={{ color: "#B42318", fontWeight: "800" }}>{error}</Text> : null}

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
              {busy ? "Creating..." : "Create account"}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={{ alignItems: "center", paddingVertical: 10 }}>
            <Text style={{ color: t.color.accent, fontWeight: "900" }}>
              I already have an account
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
