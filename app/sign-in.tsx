import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { signIn } from "../src/lib/authApi";
import { useTheme } from "../src/theme/ThemeProvider";

export default function SignIn() {
  const { t } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.color.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, paddingHorizontal: t.space[16], paddingTop: 70 }}>
        <Text style={{ fontSize: t.text["2xl"], fontWeight: "900", color: t.color.text, letterSpacing: -0.8 }}>
          Welcome back
        </Text>
        <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "600" }}>
          Sign in to like, reply, and ask.
        </Text>

        <View style={{ marginTop: 18, gap: 12 }}>
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
              placeholder="••••••••"
              placeholderTextColor={t.color.textMuted}
              style={{ marginTop: 8, color: t.color.text, fontSize: t.text.md, fontWeight: "600" }}
            />
          </View>

          {error ? (
            <Text style={{ color: "#B42318", fontWeight: "700" }}>{error}</Text>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={busy || !email.trim() || password.length < 8}
            style={{
              marginTop: 4,
              paddingVertical: 14,
              borderRadius: t.radius.pill,
              backgroundColor: busy || !email.trim() || password.length < 8 ? t.color.border : t.color.accent,
              alignItems: "center",
            }}
          >
            <Text style={{ color: t.color.textOnAccent, fontWeight: "900", fontSize: t.text.md }}>
              {busy ? "Signing in..." : "Sign in"}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push("/sign-up")} style={{ alignItems: "center", paddingVertical: 10 }}>
            <Text style={{ color: t.color.accent, fontWeight: "900" }}>Create an account</Text>
          </Pressable>

          <Pressable onPress={() => router.replace("/")} style={{ alignItems: "center", paddingVertical: 6 }}>
            <Text style={{ color: t.color.textMuted, fontWeight: "700" }}>Continue browsing</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
