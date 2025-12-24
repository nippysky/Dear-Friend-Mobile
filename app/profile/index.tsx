// app/profile/index.tsx
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
  createdAt?: string | null;
};

type MeResponse = { user: Me };

function Row({ label, value }: { label: string; value: string }) {
  const { t } = useTheme();
  return (
    <View style={{ paddingVertical: 10 }}>
      <Text style={{ color: t.color.textMuted, fontWeight: "800" }}>{label}</Text>
      <Text style={{ marginTop: 4, color: t.color.text, fontWeight: "900", letterSpacing: -0.2 }}>
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);

    const ok = await requireAuth("/profile");
    if (!ok) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch<MeResponse>("/api/me", { method: "GET" });
      setMe(data?.user ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn’t load profile.");
      setMe(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const username = useMemo(() => me?.username?.trim() || "—", [me]);
  const email = useMemo(() => me?.email?.trim() || "—", [me]);

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
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <View>
          <Text style={{ fontSize: t.text.xl, fontWeight: "900", color: t.color.text, letterSpacing: -0.6 }}>
            Profile
          </Text>
          <Text style={{ marginTop: 6, color: t.color.textMuted, fontWeight: "700" }}>
            Simple settings for v1.
          </Text>
        </View>

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
        <Text style={{ fontWeight: "900", color: t.color.text, letterSpacing: -0.2 }}>
          Account
        </Text>

        {loading ? (
          <View style={{ marginTop: 16, alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : err ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: t.color.textMuted, fontWeight: "800" }}>{err}</Text>

            <Pressable
              onPress={load}
              style={({ pressed }) => ({
                marginTop: 12,
                alignSelf: "flex-start",
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: t.radius.pill,
                backgroundColor: t.color.surfaceAlt,
                borderWidth: 1,
                borderColor: t.color.border,
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <Text style={{ fontWeight: "900", color: t.color.text }}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginTop: 10 }}>
            <Row label="Username" value={`@${username === "—" ? "—" : username}`} />
            <View style={{ height: 1, backgroundColor: t.color.border, opacity: 0.7 }} />
            <Row label="Email" value={email} />
          </View>
        )}

        {/* Change password */}
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
