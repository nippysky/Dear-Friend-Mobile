// app/profile/index.tsx
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch } from "../../src/lib/api";
import { requireAuth } from "../../src/lib/requireAuth";
import { clearTokens } from "../../src/lib/session";
import { useTheme } from "../../src/theme/ThemeProvider";

type Me = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
};

export default function ProfileScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ok = await requireAuth("/profile");
      if (!ok) return;

      try {
        const data = (await apiFetch("/api/me", { method: "GET" })) as Me; // ✅ typed
        setMe(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.color.bg,
        paddingTop: insets.top + 16,
        paddingHorizontal: t.space[16],
        paddingBottom: insets.bottom + 16,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: t.text.xl, fontWeight: "900", color: t.color.text, letterSpacing: -0.6 }}>
          Profile
        </Text>

        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await clearTokens();
            router.replace("/" as any);
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, padding: 6 })}
          hitSlop={10}
        >
          <Text style={{ color: t.color.textMuted, fontWeight: "900" }}>Sign out</Text>
        </Pressable>
      </View>

      <Text style={{ marginTop: 6, color: t.color.textMuted, fontWeight: "700" }}>
        Simple settings for v1.
      </Text>

      {/* Account */}
      <View
        style={{
          marginTop: 16,
          backgroundColor: t.color.surface,
          borderWidth: 1,
          borderColor: t.color.border,
          borderRadius: t.radius.xl,
          padding: t.space[16],
        }}
      >
        <Text style={{ fontWeight: "900", color: t.color.text }}>Account</Text>

        {loading ? (
          <View style={{ marginTop: 12 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <View style={{ marginTop: 10, gap: 6 }}>
            <Text style={{ color: t.color.textMuted, fontWeight: "800" }}>
              Username: <Text style={{ color: t.color.text }}>{me?.username ?? "—"}</Text>
            </Text>
            <Text style={{ color: t.color.textMuted, fontWeight: "800" }}>
              Email: <Text style={{ color: t.color.text }}>{me?.email ?? "—"}</Text>
            </Text>
          </View>
        )}

        {/* ✅ Change password nav button */}
        <Pressable
          onPress={() => router.push("/profile/password" as any)}
          style={({ pressed }) => ({
            marginTop: 14,
            paddingVertical: 12,
            borderRadius: t.radius.pill,
            backgroundColor: t.color.surfaceAlt,
            borderWidth: 1,
            borderColor: t.color.border,
            alignItems: "center",
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <Text style={{ fontWeight: "900", color: t.color.text }}>Change password</Text>
        </Pressable>
      </View>
    </View>
  );
}
