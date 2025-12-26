// app/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFeed, type FeedFilter, type FeedItem, type FeedPage } from "../src/hooks/useFeed";
import { apiFetch } from "../src/lib/api";
import { requireAuth } from "../src/lib/requireAuth";
import { clearTokens } from "../src/lib/session";
import { useTheme } from "../src/theme/ThemeProvider";

const PREVIEW_CHARS = 140;
const HEADER_HEIGHT = 52;

function categoryLabel(c: FeedItem["category"]) {
  switch (c) {
    case "PERSONAL":
      return "Personal";
    case "RELATIONSHIP":
      return "Relationship";
    case "CAREER":
      return "Career";
  }
}

function categoryTint(t: any, c: FeedItem["category"]) {
  if (c === "PERSONAL") return t.color.accentSoft;
  if (c === "RELATIONSHIP") return t.color.blushSoft;
  return t.color.surfaceAlt;
}

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

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: t.radius.pill,
        borderWidth: 1,
        borderColor: active ? t.color.text : withAlpha(t.color.border, 0.9),
        backgroundColor: active ? t.color.text : withAlpha(t.color.surface, 0.92),
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        style={{
          fontSize: t.text.xs,
          fontWeight: "600",
          color: active ? t.color.bg : t.color.textMuted,
          letterSpacing: -0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StickyHeader({
  active,
  setActive,
  onProfile,
  tint,
}: {
  active: FeedFilter;
  setActive: (v: FeedFilter) => void;
  onProfile: () => void;
  tint: string;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top,
        // ✅ SOLID header; never see content underneath
        backgroundColor: tint,
        borderBottomWidth: 1,
        borderBottomColor: withAlpha(t.color.border, 0.85),
        zIndex: 20,
      }}
    >
      <View
        style={{
          height: HEADER_HEIGHT,
          paddingHorizontal: t.space[16],
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ marginRight: 8 }}>
            <FilterPill label="All" active={active === "ALL"} onPress={() => setActive("ALL")} />
          </View>
          <View style={{ marginRight: 8 }}>
            <FilterPill
              label="Relationship"
              active={active === "RELATIONSHIP"}
              onPress={() => setActive("RELATIONSHIP")}
            />
          </View>
          <View style={{ marginRight: 8 }}>
            <FilterPill label="Career" active={active === "CAREER"} onPress={() => setActive("CAREER")} />
          </View>
          <FilterPill label="Personal" active={active === "PERSONAL"} onPress={() => setActive("PERSONAL")} />
        </View>

        <Pressable
          onPress={onProfile}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: withAlpha(t.color.border, 0.9),
            backgroundColor: withAlpha(t.color.surface, 0.92),
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="person-outline" size={18} color={t.color.text} />
        </Pressable>
      </View>
    </View>
  );
}

function IconAction({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: boolean;
}) {
  const { t } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ alignItems: "center", opacity: pressed ? 0.85 : 1 })} hitSlop={10}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: withAlpha(t.color.surface, 0.95),
          borderWidth: 1,
          borderColor: t.color.border,
          alignItems: "center",
          justifyContent: "center",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        }}
      >
        <Ionicons name={icon} size={20} color={accent ? t.color.accent : t.color.text} />
      </View>

      {/* ✅ fixed height prevents layout reflow */}
      <View style={{ height: 18, marginTop: 6, justifyContent: "center" }}>
        <Text style={{ fontSize: t.text.xs, fontWeight: "600", color: t.color.textMuted }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function AskFab({ onPress }: { onPress: () => void }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        position: "absolute",
        bottom: Math.max(14, insets.bottom + 10),
        alignSelf: "center",
        transform: [{ scale: pressed ? 0.98 : 1 }],
        zIndex: 30,
      })}
      hitSlop={12}
    >
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: t.radius.pill,
          backgroundColor: t.color.accent,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.18)",
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 6,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.18)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={16} color={t.color.textOnAccent} />
        </View>

        <Text style={{ color: t.color.textOnAccent, fontSize: t.text.md, fontWeight: "700", letterSpacing: -0.2 }}>
          Ask
        </Text>
      </View>
    </Pressable>
  );
}

function CategoryChip({ label, onPress }: { label: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: t.radius.pill,
        backgroundColor: withAlpha(t.color.surface, 0.95),
        borderWidth: 1,
        borderColor: t.color.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: t.color.textMuted, fontSize: t.text.xs, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  subtitle: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: t.space[16], paddingTop: insets.top + 84 }}>
      <View
        style={{
          borderRadius: t.radius.xl,
          borderWidth: 1,
          borderColor: t.color.border,
          backgroundColor: withAlpha(t.color.surface, 0.92),
          padding: t.space[16],
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: withAlpha(t.color.accentSoft ?? t.color.surfaceAlt, 0.85),
            borderWidth: 1,
            borderColor: withAlpha(t.color.border, 0.75),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="sparkles-outline" size={22} color={t.color.text} />
        </View>

        <Text style={{ marginTop: 14, fontSize: t.text.lg, fontWeight: "900", color: t.color.text, letterSpacing: -0.4 }}>
          {title}
        </Text>
        <Text style={{ marginTop: 6, color: t.color.textMuted, fontWeight: "700", lineHeight: 20 }}>
          {subtitle}
        </Text>

        <View style={{ marginTop: 14, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Pressable
            onPress={onPrimary}
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
            <Text style={{ fontWeight: "900", color: t.color.textOnAccent }}>{primaryLabel}</Text>
          </Pressable>

          {secondaryLabel && onSecondary ? (
            <Pressable
              onPress={onSecondary}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderRadius: t.radius.pill,
                backgroundColor: t.color.surfaceAlt,
                borderWidth: 1,
                borderColor: t.color.border,
                opacity: pressed ? 0.9 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              })}
            >
              <Ionicons name="grid-outline" size={16} color={t.color.text} />
              <Text style={{ fontWeight: "900", color: t.color.text }}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ReelItem({
  item,
  height,
  onLike,
  onOpenPost,
  liked,
  headerOffset,
  showCategoryChip,
  onSelectCategory,
}: {
  item: FeedItem;
  height: number;
  onLike: () => void;
  onOpenPost: () => void;
  liked: boolean;
  headerOffset: number;
  showCategoryChip: boolean;
  onSelectCategory: (c: FeedItem["category"]) => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const label = categoryLabel(item.category);
  const tint = categoryTint(t, item.category);

  const isLong = item.body.length > PREVIEW_CHARS;
  const preview = isLong ? item.body.slice(0, PREVIEW_CHARS).trimEnd() + "…" : item.body;

  return (
    <View style={{ height, backgroundColor: t.color.bg }}>
      <LinearGradient
        colors={[withAlpha(tint, 0.72), withAlpha(tint, 0.34), withAlpha(tint, 0.06)]}
        start={{ x: 0.15, y: 0.05 }}
        end={{ x: 0.95, y: 0.95 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <View
        style={{
          flex: 1,
          paddingTop: headerOffset,
          paddingBottom: Math.max(116, insets.bottom + 90),
          paddingHorizontal: t.space[16],
          justifyContent: "center",
        }}
      >
        {showCategoryChip ? <CategoryChip label={label} onPress={() => onSelectCategory(item.category)} /> : null}

        <Text
          style={{
            marginTop: showCategoryChip ? 14 : 0,
            fontSize: 28,
            lineHeight: 34,
            fontWeight: "700",
            color: t.color.text,
            letterSpacing: -0.4,
          }}
          numberOfLines={7}
        >
          {preview}
        </Text>

        <View style={{ marginTop: 16 }}>
          <Text style={{ color: t.color.textMuted, fontWeight: "600" }}>@{item.author.username}</Text>

          {isLong ? (
            <Pressable onPress={onOpenPost} style={({ pressed }) => ({ marginTop: 10, opacity: pressed ? 0.75 : 1 })}>
              <Text style={{ color: t.color.accent, fontWeight: "700" }}>Read more</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View
        style={{
          position: "absolute",
          right: 12,
          bottom: Math.max(116, insets.bottom + 108),
          gap: 14,
          alignItems: "center",
        }}
      >
        <IconAction icon={liked ? "heart" : "heart-outline"} label={`${item.counts.likes}`} onPress={onLike} accent={liked} />
        <IconAction icon="chatbubble-ellipses-outline" label={`${item.counts.replies}`} onPress={onOpenPost} />
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const pageHeight = useMemo(() => Math.round(height), [height]);
  const headerOffset = insets.top + HEADER_HEIGHT + 18;

  const listRef = useRef<FlashListRef<FeedItem> | null>(null);

  const [filter, setFilter] = useState<FeedFilter>("ALL");
  const [activeIndex, setActiveIndex] = useState(0);
  const [headerTint, setHeaderTint] = useState<string>(t.color.bg);

  const { data, isPending, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed(filter);

  const items = useMemo(() => {
    const pages = data?.pages ?? [];
    const flat = pages.flatMap((p) => (Array.isArray(p.items) ? p.items : []));
    return flat.filter((x) => x && typeof x.id === "string" && x.id.length > 0 && x.id !== "undefined");
  }, [data]);

  const computeHeaderTint = useCallback(
    (idx: number) => {
      const it = items[idx];
      return it ? categoryTint(t, it.category) : t.color.bg;
    },
    [items, t]
  );

  useEffect(() => {
    setActiveIndex(0);
    setHeaderTint(computeHeaderTint(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // ✅ Pull-to-refresh spinner
  const [refreshing, setRefreshing] = useState(false);
  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      setActiveIndex(0);
      setHeaderTint(computeHeaderTint(0));
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    } finally {
      setRefreshing(false);
    }
  }, [computeHeaderTint, refetch]);

  const openPost = useCallback(
    (id: string, focus?: "reply") => {
      if (!id || id === "undefined") return;
      router.push({ pathname: "/post/[id]", params: { id, ...(focus ? { focus } : {}) } } as any);
    },
    [router]
  );

  // silent auth lock
  const authLockRef = useRef(false);
  const ensureAuthed = useCallback(async (nextPath: string) => {
    if (authLockRef.current) return false;
    authLockRef.current = true;
    try {
      return await requireAuth(nextPath);
    } finally {
      authLockRef.current = false;
    }
  }, []);

  const redirectToSignIn = useCallback(
    (nextPath: string) => {
      const encoded = encodeURIComponent(nextPath);
      router.push((`/sign-in?next=${encoded}`) as any);
    },
    [router]
  );

  // optimistic like patch across infinite pages
  const patchFeedLike = useCallback(
    (postId: string, nextLiked: boolean) => {
      qc.setQueryData(["feed", filter], (old: unknown) => {
        const o = old as InfiniteData<FeedPage> | undefined;
        if (!o?.pages) return old;

        const nextPages = o.pages.map((pg) => {
          const nextItems = pg.items.map((it) => {
            if (it.id !== postId) return it;

            const cur = !!it.likedByMe;
            const delta = nextLiked === cur ? 0 : nextLiked ? 1 : -1;

            return {
              ...it,
              likedByMe: nextLiked,
              counts: { ...it.counts, likes: Math.max(0, (it.counts?.likes ?? 0) + delta) },
            };
          });

          return { ...pg, items: nextItems };
        });

        return { ...o, pages: nextPages };
      });
    },
    [filter, qc]
  );

  const likePost = useCallback(
    async (postId: string, currentLiked: boolean) => {
      if (!postId || postId === "undefined") return;

      const nextPath = `/post/${postId}`;
      const ok = await ensureAuthed(nextPath);
      if (!ok) return;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const nextLiked = !currentLiked;
      patchFeedLike(postId, nextLiked);

      try {
        if (currentLiked) {
          await apiFetch(`/api/likes`, { method: "DELETE", json: { postId } });
        } else {
          await apiFetch(`/api/likes`, { method: "POST", json: { postId } });
        }
        // don’t force feed refetch immediately (prevents “revert” + jitter)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (/session expired/i.test(msg)) {
          await clearTokens();
          redirectToSignIn(nextPath);
          return;
        }
        // rollback
        patchFeedLike(postId, currentLiked);
      }
    },
    [ensureAuthed, patchFeedLike, redirectToSignIn]
  );

  const openAsk = useCallback(async () => {
    const nextPath = "/(modals)/ask";
    const ok = await ensureAuthed(nextPath);
    if (!ok) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(modals)/ask" as any);
  }, [ensureAuthed, router]);

  const openProfile = useCallback(async () => {
    const nextPath = "/profile";
    const ok = await ensureAuthed(nextPath);
    if (!ok) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/profile" as any);
  }, [ensureAuthed, router]);

  const setFilterAndReset = useCallback(
    async (next: FeedFilter) => {
      setFilter(next);
      setActiveIndex(0);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    },
    []
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y ?? 0;
      const idx = Math.max(0, Math.round(y / pageHeight));
      if (idx === activeIndex) return;

      setActiveIndex(idx);
      setHeaderTint(computeHeaderTint(idx));

      if (hasNextPage && !isFetchingNextPage && idx >= items.length - 6) {
        fetchNextPage();
      }
    },
    [activeIndex, computeHeaderTint, fetchNextPage, hasNextPage, isFetchingNextPage, items.length, pageHeight]
  );

  const selectCategoryFromPost = useCallback(
    (c: FeedItem["category"]) => {
      setFilterAndReset(c);
    },
    [setFilterAndReset]
  );

  const isEmpty = !isPending && !isError && items.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      <StickyHeader active={filter} setActive={setFilterAndReset} onProfile={openProfile} tint={headerTint} />

      {isPending ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, padding: t.space[16], justifyContent: "center" }}>
          <Text style={{ color: t.color.text, fontWeight: "800", fontSize: t.text.lg }}>Couldn’t load feed</Text>
          <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "600" }}>
            {(error as Error)?.message ?? "Unknown error"}
          </Text>

          <Pressable
            onPress={() => refetch()}
            style={{
              marginTop: 14,
              alignSelf: "flex-start",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: t.radius.pill,
              backgroundColor: t.color.surface,
              borderWidth: 1,
              borderColor: t.color.border,
            }}
          >
            <Text style={{ fontWeight: "700", color: t.color.text }}>Retry</Text>
          </Pressable>
        </View>
      ) : isEmpty ? (
        <EmptyState
          title={filter === "ALL" ? "No questions yet" : `No ${categoryLabel(filter)} questions yet`}
          subtitle={
            filter === "ALL"
              ? "Ask something real. Keep it simple. Let people help."
              : "This category is quiet right now. You can ask something, or switch back to All."
          }
          primaryLabel="Ask"
          onPrimary={openAsk}
          secondaryLabel={filter === "ALL" ? undefined : "View All"}
          onSecondary={filter === "ALL" ? undefined : () => setFilterAndReset("ALL")}
        />
      ) : (
        <FlashList
          ref={listRef}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const liked = !!item.likedByMe;
            return (
              <ReelItem
                item={item}
                height={pageHeight}
                headerOffset={headerOffset}
                liked={liked}
                onLike={() => likePost(item.id, liked)}
                onOpenPost={() => openPost(item.id)}
                showCategoryChip={filter === "ALL"}
                onSelectCategory={selectCategoryFromPost}
              />
            );
          }}
          pagingEnabled
          snapToInterval={pageHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          drawDistance={pageHeight * 2}
          onMomentumScrollEnd={onMomentumScrollEnd}
          // ✅ Pull to refresh (shows indicator)
          onRefresh={onPullRefresh}
          refreshing={refreshing}
        />
      )}

      <AskFab onPress={openAsk} />
    </View>
  );
}
