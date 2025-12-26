// app/profile/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiFetch } from "../../src/lib/api";
import { requireAuth } from "../../src/lib/requireAuth";
import { clearTokens } from "../../src/lib/session";
import { useTheme } from "../../src/theme/ThemeProvider";

type Category = "PERSONAL" | "RELATIONSHIP" | "CAREER";

type Me = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  createdAt?: string | null;
};

type MeResponse = { user: Me };

type MyPost = {
  id: string;
  category: Category;
  body: string;
  createdAt: string;
  counts: { replies: number; likes: number };
};

type MyPostsResponse = {
  items: MyPost[];
  nextCursor: string | null;
  totalCount: number | null;
};

type Tab = "QUESTIONS" | "SETTINGS";

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

function categoryLabel(c: Category) {
  switch (c) {
    case "PERSONAL":
      return "Personal";
    case "RELATIONSHIP":
      return "Relationship";
    case "CAREER":
      return "Career";
  }
}

function formatWAT(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    const date = new Intl.DateTimeFormat("en-NG", { month: "short", day: "2-digit" }).format(d);
    const time = new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit" }).format(d);
    return `${date} • ${time} WAT`;
  } catch {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm} • ${hh}:${mi} WAT`;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  const { t } = useTheme();
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontWeight: "900", color: t.color.text, letterSpacing: -0.3 }}>{value}</Text>
      <Text style={{ marginTop: 2, fontWeight: "800", color: t.color.textMuted, fontSize: t.text.xs }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * ✅ Cross-platform segmented control w/ sliding thumb (iOS-ish)
 */
function SegmentedControl({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (v: Tab) => void;
}) {
  const { t } = useTheme();

  const items: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "QUESTIONS", label: "Questions", icon: "list-outline" },
    { key: "SETTINGS", label: "Settings", icon: "settings-outline" },
  ];

  const [w, setW] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const index = value === "QUESTIONS" ? 0 : 1;
  const segW = w > 0 ? w / 2 : 0;

  useEffect(() => {
    if (!segW) return;
    Animated.timing(translateX, {
      toValue: index * segW,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, segW, translateX]);

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{
        position: "relative",
        flexDirection: "row",
        borderRadius: t.radius.pill,
        borderWidth: 1,
        borderColor: withAlpha(t.color.border, 0.95),
        backgroundColor: withAlpha(t.color.surface, 0.7),
        overflow: "hidden",
      }}
    >
      {/* Sliding thumb */}
      {segW > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 2,
            bottom: 2,
            left: 2,
            width: segW - 4,
            borderRadius: t.radius.pill,
            backgroundColor: withAlpha(t.color.text, 0.92),
            transform: [{ translateX }],
          }}
        />
      ) : null}

      {items.map((it) => {
        const active = value === it.key;

        return (
          <Pressable
            key={it.key}
            onPress={async () => {
              if (it.key === value) return;
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(it.key);
            }}
            hitSlop={10}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 12,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Ionicons name={it.icon} size={16} color={active ? t.color.bg : t.color.textMuted} />
            <Text
              style={{
                fontWeight: "900",
                fontSize: t.text.xs,
                color: active ? t.color.bg : t.color.textMuted,
                letterSpacing: -0.2,
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { t } = useTheme();

  const dangerColor =
    (t.color as unknown as { blush?: string; blushSoft?: string }).blush ??
    (t.color as unknown as { blushSoft?: string }).blushSoft ??
    t.color.text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: withAlpha(t.color.surfaceAlt, 0.9),
            borderWidth: 1,
            borderColor: t.color.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={18} color={danger ? dangerColor : t.color.text} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontWeight: "900",
              color: danger ? dangerColor : t.color.text,
              letterSpacing: -0.2,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ marginTop: 2, fontWeight: "700", color: t.color.textMuted }}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={t.color.textMuted} />
    </Pressable>
  );
}

function PostCard({
  item,
  onOpen,
  onMenu,
}: {
  item: MyPost;
  onOpen: () => void;
  onMenu: () => void;
}) {
  const { t } = useTheme();

  const preview = useMemo(() => {
    const s = (item.body ?? "").trim();
    return s.length > 170 ? s.slice(0, 170).trimEnd() + "…" : s;
  }, [item.body]);

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => ({
        borderRadius: t.radius.xl,
        borderWidth: 1,
        borderColor: t.color.border,
        backgroundColor: withAlpha(t.color.surface, 0.9),
        padding: t.space[16],
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: t.radius.pill,
            borderWidth: 1,
            borderColor: withAlpha(t.color.border, 0.85),
            backgroundColor: withAlpha(t.color.surfaceAlt, 0.85),
          }}
        >
          <Text style={{ fontSize: t.text.xs, fontWeight: "900", color: t.color.textMuted }}>
            {categoryLabel(item.category)}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: t.text.xs, fontWeight: "900", color: t.color.textMuted }}>
            {formatWAT(item.createdAt)}
          </Text>

          <Pressable onPress={onMenu} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, padding: 4 })}>
            <Ionicons name="ellipsis-horizontal" size={18} color={t.color.textMuted} />
          </Pressable>
        </View>
      </View>

      <Text
        style={{
          marginTop: 12,
          color: t.color.text,
          fontWeight: "900",
          letterSpacing: -0.2,
          lineHeight: 22,
        }}
        numberOfLines={3}
      >
        {preview}
      </Text>

      <View style={{ marginTop: 12, flexDirection: "row", gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={t.color.textMuted} />
          <Text style={{ color: t.color.textMuted, fontWeight: "900", fontSize: t.text.xs }}>
            {item.counts?.replies ?? 0}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="heart-outline" size={14} color={t.color.textMuted} />
          <Text style={{ color: t.color.textMuted, fontWeight: "900", fontSize: t.text.xs }}>
            {item.counts?.likes ?? 0}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [gateLoading, setGateLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("QUESTIONS");

  const [me, setMe] = useState<Me | null>(null);
  const [meErr, setMeErr] = useState<string | null>(null);

  const [posts, setPosts] = useState<MyPost[]>([]);
  const [postsErr, setPostsErr] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const loadedIdsRef = useRef<Set<string>>(new Set());

  const loadGateAndData = useCallback(async () => {
    setGateLoading(true);
    setMeErr(null);
    setPostsErr(null);

    const ok = await requireAuth("/profile");
    if (!ok) {
      setGateLoading(false);
      return;
    }

    try {
      const [meRes, postsRes] = await Promise.all([
        apiFetch<MeResponse>("/api/me", { method: "GET" }),
        apiFetch<MyPostsResponse>("/api/me/posts?limit=20", { method: "GET" }),
      ]);

      setMe(meRes?.user ?? null);

      const first = postsRes?.items ?? [];
      setPosts(first);
      loadedIdsRef.current = new Set(first.map((p) => p.id));

      setNextCursor(postsRes?.nextCursor ?? null);
      setTotalCount(typeof postsRes?.totalCount === "number" ? postsRes.totalCount : null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Couldn’t load profile.";
      setMeErr(msg);
      setPostsErr(msg);
      setMe(null);
      setPosts([]);
      loadedIdsRef.current = new Set();
      setNextCursor(null);
      setTotalCount(null);
    } finally {
      setGateLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGateAndData();
  }, [loadGateAndData]);

  const onBack = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      router.back();
    } catch {
      router.replace("/" as any);
    }
  }, [router]);

  const onAsk = useCallback(async () => {
    const ok = await requireAuth("/(modals)/ask");
    if (!ok) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(modals)/ask" as any);
  }, [router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const postsRes = await apiFetch<MyPostsResponse>("/api/me/posts?limit=20", { method: "GET" });
      const first = postsRes?.items ?? [];
      setPosts(first);
      loadedIdsRef.current = new Set(first.map((p) => p.id));
      setNextCursor(postsRes?.nextCursor ?? null);
      setTotalCount(typeof postsRes?.totalCount === "number" ? postsRes.totalCount : null);
      setPostsErr(null);
    } catch (e: unknown) {
      setPostsErr(e instanceof Error ? e.message : "Couldn’t refresh.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || refreshing) return;
    if (!nextCursor) return;

    setLoadingMore(true);
    try {
      const res = await apiFetch<MyPostsResponse>(
        `/api/me/posts?limit=20&cursor=${encodeURIComponent(nextCursor)}`,
        { method: "GET" }
      );

      const incoming = res?.items ?? [];
      const merged: MyPost[] = [];

      for (const p of incoming) {
        if (!p?.id) continue;
        if (loadedIdsRef.current.has(p.id)) continue;
        loadedIdsRef.current.add(p.id);
        merged.push(p);
      }

      if (merged.length) setPosts((prev) => prev.concat(merged));
      setNextCursor(res?.nextCursor ?? null);
      if (typeof res?.totalCount === "number") setTotalCount(res.totalCount);
      setPostsErr(null);
    } catch (e: unknown) {
      setPostsErr(e instanceof Error ? e.message : "Couldn’t load more.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, refreshing]);

  const openPost = useCallback(
    async (id: string) => {
      if (!id || id === "undefined") return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: "/post/[id]", params: { id } } as any);
    },
    [router]
  );

  const deletePost = useCallback(
    async (id: string) => {
      if (!id || id === "undefined") return;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // optimistic remove
      setPosts((prev) => prev.filter((p) => p.id !== id));
      loadedIdsRef.current.delete(id);
      setTotalCount((c) => (typeof c === "number" ? Math.max(0, c - 1) : c));

      try {
        await apiFetch<{ ok: true }>(`/api/posts/${id}`, { method: "DELETE" });
      } catch (e: unknown) {
        await onRefresh();
        Alert.alert("Delete failed", e instanceof Error ? e.message : "Couldn’t delete post.");
      }
    },
    [onRefresh]
  );

  const showPostMenu = useCallback(
    (postId: string) => {
      const doDelete = () => {
        Alert.alert("Delete this post?", "This will remove the question permanently.", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deletePost(postId) },
        ]);
      };

      const doOpen = () => openPost(postId);

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: ["Cancel", "Open", "Delete"], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
          (buttonIndex) => {
            if (buttonIndex === 1) doOpen();
            if (buttonIndex === 2) doDelete();
          }
        );
      } else {
        Alert.alert("Post options", undefined, [
          { text: "Open", onPress: doOpen },
          { text: "Delete", style: "destructive", onPress: doDelete },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    },
    [deletePost, openPost]
  );

  const username = useMemo(() => me?.username?.trim() || "—", [me]);
  const email = useMemo(() => me?.email?.trim() || "—", [me]);

  const questionsCountText = useMemo(() => {
    if (typeof totalCount === "number") return `${totalCount}`;
    return `${posts.length}`;
  }, [posts.length, totalCount]);

  if (gateLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.color.bg, alignItems: "center", justifyContent: "center" }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: t.color.textMuted, fontWeight: "800" }}>Loading…</Text>
      </View>
    );
  }

  const Header = (
    <View style={{ paddingTop: insets.top + 8 }}>
      {/* Top bar */}
      <View
        style={{
          paddingHorizontal: t.space[16],
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: 48,
        }}
      >
        <Pressable
          onPress={onBack}
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

        <Text style={{ fontWeight: "900", color: t.color.text, letterSpacing: -0.3, fontSize: t.text.md }}>
          Profile
        </Text>

        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTab((cur) => (cur === "QUESTIONS" ? "SETTINGS" : "QUESTIONS"));
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
          <Ionicons name={tab === "QUESTIONS" ? "settings-outline" : "list-outline"} size={18} color={t.color.text} />
        </Pressable>
      </View>

      {/* Hero */}
      <View style={{ paddingHorizontal: t.space[16], marginTop: 10 }}>
        <View
          style={{
            borderRadius: t.radius.xl,
            borderWidth: 1,
            borderColor: t.color.border,
            backgroundColor: withAlpha(t.color.surface, 0.9),
            padding: t.space[16],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: t.text.lg, fontWeight: "900", color: t.color.text, letterSpacing: -0.4 }}>
                @{username}
              </Text>
              <Text style={{ marginTop: 4, color: t.color.textMuted, fontWeight: "800" }} numberOfLines={1}>
                {email}
              </Text>
            </View>

            <Pressable
              onPress={onAsk}
              hitSlop={10}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderRadius: t.radius.pill,
                backgroundColor: t.color.accent,
                opacity: pressed ? 0.9 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              })}
            >
              <Ionicons name="add" size={16} color={t.color.textOnAccent} />
              <Text style={{ fontWeight: "900", color: t.color.textOnAccent }}>Ask</Text>
            </Pressable>
          </View>

          <View
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: withAlpha(t.color.border, 0.8),
              flexDirection: "row",
              justifyContent: "space-around",
            }}
          >
            <Stat label="Questions" value={questionsCountText} />
            <Stat label="Showing" value={`${posts.length}`} />
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <SegmentedControl value={tab} onChange={setTab} />
        </View>

        {meErr ? (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: t.color.textMuted, fontWeight: "800" }}>{meErr}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  const SettingsPanel = (
    <View style={{ paddingHorizontal: t.space[16], paddingTop: 14 }}>
      <View
        style={{
          borderRadius: t.radius.xl,
          borderWidth: 1,
          borderColor: t.color.border,
          backgroundColor: withAlpha(t.color.surface, 0.9),
          padding: t.space[16],
        }}
      >
        <Text style={{ fontWeight: "900", color: t.color.text, letterSpacing: -0.2 }}>Account</Text>

        <View style={{ marginTop: 10 }}>
          <Text style={{ color: t.color.textMuted, fontWeight: "800" }}>Username</Text>
          <Text style={{ marginTop: 3, color: t.color.text, fontWeight: "900" }}>@{username}</Text>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={{ color: t.color.textMuted, fontWeight: "800" }}>Email</Text>
          <Text style={{ marginTop: 3, color: t.color.text, fontWeight: "900" }}>{email}</Text>
        </View>

        <View style={{ marginTop: 14, height: 1, backgroundColor: withAlpha(t.color.border, 0.8) }} />

        <SettingRow
          icon="key-outline"
          title="Change password"
          subtitle="Update your password securely."
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/profile/password" as any);
          }}
        />

        <View style={{ height: 1, backgroundColor: withAlpha(t.color.border, 0.8) }} />

        <SettingRow
          icon="log-out-outline"
          title="Sign out"
          subtitle="You can sign in again anytime."
          danger
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await clearTokens();
            router.replace("/" as any);
          }}
        />
      </View>
    </View>
  );

  const EmptyQuestions = (
    <View style={{ paddingHorizontal: t.space[16], paddingTop: 14 }}>
      <View
        style={{
          borderRadius: t.radius.xl,
          borderWidth: 1,
          borderColor: t.color.border,
          backgroundColor: withAlpha(t.color.surface, 0.9),
          padding: t.space[16],
        }}
      >
        <Text style={{ fontWeight: "900", color: t.color.text, letterSpacing: -0.2 }}>No questions yet</Text>
        <Text style={{ marginTop: 6, color: t.color.textMuted, fontWeight: "700", lineHeight: 20 }}>
          Ask one good question and let the world do its thing.
        </Text>

        <Pressable
          onPress={onAsk}
          style={({ pressed }) => ({
            marginTop: 12,
            alignSelf: "flex-start",
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderRadius: t.radius.pill,
            backgroundColor: t.color.accent,
            opacity: pressed ? 0.9 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          })}
        >
          <Ionicons name="add" size={16} color={t.color.textOnAccent} />
          <Text style={{ fontWeight: "900", color: t.color.textOnAccent }}>Ask</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {tab === "SETTINGS" ? (
        <FlashList
          data={[] as never[]}
          keyExtractor={(_, i) => String(i)}
          renderItem={() => null}
          ListHeaderComponent={
            <View>
              {Header}
              {SettingsPanel}
              <View style={{ height: insets.bottom + 24 }} />
            </View>
          }
          ListEmptyComponent={<View />}
        />
      ) : (
        <FlashList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 24,
            paddingTop: 12,
          }}
          ListHeaderComponent={
            <View>
              {Header}

              <View style={{ paddingHorizontal: t.space[16], marginTop: 14, marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: t.text.md, fontWeight: "900", color: t.color.text, letterSpacing: -0.2 }}>
                    My Questions
                  </Text>

                  <Pressable onPress={onRefresh} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, padding: 6 })}>
                    <Text style={{ color: t.color.textMuted, fontWeight: "900" }}>
                      {refreshing ? "Refreshing…" : "Refresh"}
                    </Text>
                  </Pressable>
                </View>

                {postsErr ? (
                  <Text style={{ marginTop: 6, color: t.color.textMuted, fontWeight: "800" }}>{postsErr}</Text>
                ) : null}
              </View>

              {posts.length === 0 && !refreshing ? EmptyQuestions : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: t.space[16], marginBottom: 12 }}>
              <PostCard item={item} onOpen={() => openPost(item.id)} onMenu={() => showPostMenu(item.id)} />
            </View>
          )}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReachedThreshold={0.6}
          onEndReached={loadMore}
          ListFooterComponent={
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              {loadingMore ? <ActivityIndicator /> : null}
              {!nextCursor && posts.length > 0 ? (
                <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "800" }}>
                  You’re all caught up.
                </Text>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}
