import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { signIn, signUp } from "../src/lib/authApi";
import { useTheme } from "../src/theme/ThemeProvider";

export default function SignUp() {
  const { t } = useTheme();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signUp({ username: username.trim(), email: email.trim(), password });
      // auto sign-in after sign-up (smooth UX)
      await signIn({ email: email.trim(), password });
      router.replace("/");
    } catch (e: any) {
      setError(e?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  const valid =
    username.trim().length >= 3 &&
    /^[a-zA-Z0-9_]+$/.test(username.trim()) &&
    email.trim().includes("@") &&
    password.length >= 8;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.color.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, paddingHorizontal: t.space[16], paddingTop: 70 }}>
        <Text style={{ fontSize: t.text["2xl"], fontWeight: "900", color: t.color.text, letterSpacing: -0.8 }}>
          Create account
        </Text>
        <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "600" }}>
          Just email + password. No social logins.
        </Text>

        <View style={{ marginTop: 18, gap: 12 }}>
          <View style={{ backgroundColor: t.color.surface, borderWidth: 1, borderColor: t.color.border, borderRadius: t.radius.xl, padding: t.space[16] }}>
            <Text style={{ color: t.color.textMuted, fontSize: t.text.sm, fontWeight: "700" }}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="e.g. nippy_01"
              placeholderTextColor={t.color.textMuted}
              style={{ marginTop: 8, color: t.color.text, fontSize: t.text.md, fontWeight: "600" }}
            />
            <Text style={{ marginTop: 6, color: t.color.textMuted, fontSize: t.text.xs, fontWeight: "600" }}>
              Letters, numbers, underscore.
            </Text>
          </View>

          <View style={{ backgroundColor: t.color.surface, borderWidth: 1, borderColor: t.color.border, borderRadius: t.radius.xl, padding: t.space[16] }}>
            <Text style={{ color: t.color.textMuted, fontSize: t.text.sm, fontWeight: "700" }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={t.color.textMuted}
              style={{ marginTop: 8, color: t.color.text, fontSize: t.text.md, fontWeight: "600" }}
            />
          </View>

          <View style={{ backgroundColor: t.color.surface, borderWidth: 1, borderColor: t.color.border, borderRadius: t.radius.xl, padding: t.space[16] }}>
            <Text style={{ color: t.color.textMuted, fontSize: t.text.sm, fontWeight: "700" }}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="8+ characters"
              placeholderTextColor={t.color.textMuted}
              style={{ marginTop: 8, color: t.color.text, fontSize: t.text.md, fontWeight: "600" }}
            />
          </View>

          {error ? <Text style={{ color: "#B42318", fontWeight: "700" }}>{error}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={busy || !valid}
            style={{
              marginTop: 4,
              paddingVertical: 14,
              borderRadius: t.radius.pill,
              backgroundColor: busy || !valid ? t.color.border : t.color.accent,
              alignItems: "center",
            }}
          >
            <Text style={{ color: t.color.textOnAccent, fontWeight: "900", fontSize: t.text.md }}>
              {busy ? "Creating..." : "Create account"}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={{ alignItems: "center", paddingVertical: 10 }}>
            <Text style={{ color: t.color.accent, fontWeight: "900" }}>I already have an account</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
