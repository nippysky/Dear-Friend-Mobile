import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../src/components/ui/AppText";
import { listBlockedUsers, unblockUser, type BlockedUser } from "../../src/lib/moderationApi";
import { requireAuth } from "../../src/lib/requireAuth";
import { useTheme } from "../../src/theme/ThemeProvider";

function withAlpha(color: string, alpha: number) {
  if (!color || typeof color !== "string") return color;
  const a = Math.max(0, Math.min(1, alpha));
  if (color.startsWith("rgba(") || color.startsWith("rgb(")) return color;

  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const expand = (s: string) => s.split("").map((ch) => ch + ch).join("");
    const h = hex.length === 3 ? expand(hex) : hex;
    if (h.length !== 6) return color;

    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return color;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return color;
}

function formatHandle(u: BlockedUser) {
  const handle = (u.username ?? "").trim();
  if (handle) return `@${handle}`;
  return "Unknown user";
}

export default function BlockedUsersScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<BlockedUser[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    const ok = await requireAuth("/profile/blocked");
    if (!ok) {
      setLoading(false);
      return;
    }

    try {
      const res = await listBlockedUsers(100);
      setItems(res?.items ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Couldn’t load blocked users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmUnblock = useCallback(
    (u: BlockedUser) => {
      const handle = formatHandle(u);

      const doUnblock = async () => {
        if (busyId) return;
        setBusyId(u.id);

        // optimistic remove
        const prev = items;
        setItems((cur) => cur.filter((x) => x.id !== u.id));

        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await unblockUser(u.id);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e: any) {
          // revert
          setItems(prev);
          Alert.alert("Unblock failed", e?.message ?? "Couldn’t unblock.");
        } finally {
          setBusyId(null);
        }
      };

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: `Unblock ${handle}?`,
            options: ["Cancel", "Unblock"],
            cancelButtonIndex: 0,
            destructiveButtonIndex: 1,
            userInterfaceStyle: "light",
          },
          (idx) => {
            if (idx === 1) doUnblock();
          }
        );
      } else {
        Alert.alert(`Unblock ${handle}?`, "They will be able to interact with you again.", [
          { text: "Cancel", style: "cancel" },
          { text: "Unblock", style: "destructive", onPress: doUnblock },
        ]);
      }
    },
    [busyId, items]
  );

  const Header = useMemo(() => {
    return (
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: t.space[16], paddingBottom: 10 }}>
        <View style={{ height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: withAlpha(t.color.surface, 0.85),
              borderWidth: 1,
              borderColor: t.color.border,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="chevron-back" size={18} color={t.color.text} />
          </Pressable>

          <AppText variant="body" weight="semibold" style={{ color: t.color.text, letterSpacing: -0.2 }}>
            Blocked users
          </AppText>

          <Pressable
            onPress={load}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: withAlpha(t.color.surface, 0.85),
              borderWidth: 1,
              borderColor: t.color.border,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="refresh-outline" size={18} color={t.color.text} />
          </Pressable>
        </View>

        <AppText variant="muted" weight="regular" style={{ marginTop: 6 }}>
          Manage people you’ve blocked.
        </AppText>

        {err ? (
          <AppText variant="muted" weight="regular" style={{ marginTop: 8 }}>
            {err}
          </AppText>
        ) : null}
      </View>
    );
  }, [err, insets.top, load, router, t]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.color.bg, alignItems: "center", justifyContent: "center" }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator />
        <AppText variant="muted" weight="regular" style={{ marginTop: 10 }}>
          Loading…
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlashList
        data={items}
        keyExtractor={(it) => it.id}
        ListHeaderComponent={Header}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) => {
          const handle = formatHandle(item);
          const name = (item.displayName ?? "").trim();
          const isBusy = busyId === item.id;

          return (
            <View style={{ paddingHorizontal: t.space[16], paddingBottom: 12 }}>
              <View
                style={{
                  borderRadius: t.radius.xl,
                  borderWidth: 1,
                  borderColor: withAlpha(t.color.border, 0.9),
                  backgroundColor: withAlpha(t.color.surface, 0.92),
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <AppText variant="body" weight="semibold" style={{ color: t.color.text, letterSpacing: -0.15 }}>
                    {handle}
                  </AppText>
                  {name ? (
                    <AppText variant="muted" weight="regular" style={{ marginTop: 2 }}>
                      {name}
                    </AppText>
                  ) : null}
                </View>

                <Pressable
                  onPress={() => confirmUnblock(item)}
                  disabled={isBusy}
                  style={({ pressed }) => ({
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: withAlpha(t.color.surfaceAlt, 0.85),
                    borderWidth: 1,
                    borderColor: withAlpha(t.color.border, 0.9),
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <AppText variant="label" weight="semibold" style={{ color: t.color.textMuted }}>
                    {isBusy ? "…" : "Unblock"}
                  </AppText>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: t.space[16], paddingTop: 8 }}>
            <View
              style={{
                borderRadius: t.radius.xl,
                borderWidth: 1,
                borderColor: withAlpha(t.color.border, 0.9),
                backgroundColor: withAlpha(t.color.surface, 0.92),
                padding: t.space[16],
              }}
            >
              <AppText variant="body" weight="semibold" style={{ color: t.color.text, letterSpacing: -0.15 }}>
                No blocked users
              </AppText>
              <AppText variant="muted" weight="regular" style={{ marginTop: 6, lineHeight: t.line.sm }}>
                Anyone you block will appear here.
              </AppText>
            </View>
          </View>
        }
      />
    </View>
  );
}
