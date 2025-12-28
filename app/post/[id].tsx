// app/post/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../src/components/ui/AppText";
import { useCreateReply } from "../../src/hooks/useCreateReply";
import type { FeedPage } from "../../src/hooks/useFeed";
import { usePost } from "../../src/hooks/usePost";
import { useToggleLike } from "../../src/hooks/useToggleLike";
import { apiFetch } from "../../src/lib/api";
import { isAuthed } from "../../src/lib/authState";
import { requireAuth } from "../../src/lib/requireAuth";
import { useTheme } from "../../src/theme/ThemeProvider";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
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

type Cat = "PERSONAL" | "RELATIONSHIP" | "CAREER";

function categoryLabel(c: Cat) {
  if (c === "PERSONAL") return "Personal";
  if (c === "RELATIONSHIP") return "Relationship";
  return "Career";
}

function categoryTint(t: any, c: Cat) {
  if (c === "PERSONAL") return t.color.accentSoft;
  if (c === "RELATIONSHIP") return t.color.blushSoft;
  return t.color.surfaceAlt;
}

function titleSizing(body: string) {
  // Keep it calm (closer to web): lighter + slightly smaller than before.
  const len = body.trim().length;
  if (len <= 70) return { fontSize: 22, lineHeight: 28 };
  if (len <= 140) return { fontSize: 20, lineHeight: 26 };
  if (len <= 280) return { fontSize: 18, lineHeight: 24 };
  if (len <= 520) return { fontSize: 17, lineHeight: 23 };
  return { fontSize: 16, lineHeight: 22 };
}

function TinyPill({ text }: { text: string }) {
  const { t } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: withAlpha(t.color.surface, 0.92),
        borderWidth: 1,
        borderColor: withAlpha(t.color.border, 0.9),
      }}
    >
      <AppText variant="label" weight="medium" style={{ color: t.color.textMuted }}>
        {text}
      </AppText>
    </View>
  );
}

function IconChip({
  icon,
  label,
  onPress,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? withAlpha(t.color.blushSoft, 0.9) : withAlpha(t.color.surface, 0.92),
        borderWidth: 1,
        borderColor: withAlpha(t.color.border, 0.9),
        opacity: pressed ? 0.86 : 1,
      })}
    >
      <Ionicons name={icon} size={16} color={active ? t.color.accent : t.color.textMuted} />
      <AppText variant="label" weight="semibold" style={{ color: t.color.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}

type PostShape = {
  id: string;
  category: Cat;
  body: string;
  likedByMe: boolean;
  author: { username: string };
  counts: { likes: number; replies: number };
};

type ReplyItem = {
  id: string;
  body: string;
  isPinned?: boolean;
  likedByMe: boolean;
  author: { id: string; username: string; displayName: string | null };
  counts: { likes: number };
};

export default function PostDetail() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const params = useLocalSearchParams<{ id?: string | string[]; focus?: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const postId = typeof rawId === "string" && rawId !== "undefined" ? rawId : "";
  const focus = typeof params.focus === "string" ? params.focus : undefined;

  const validPostId = !!postId && isUuid(postId);

  const { data, isLoading, isError, error, refetch } = usePost(postId, { enabled: validPostId });
  const post = (data?.post ?? null) as PostShape | null;
  const replies = (data?.replies ?? []) as ReplyItem[];

  const tint = post ? categoryTint(t, post.category) : t.color.bg;

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [reply, setReply] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    isAuthed().then(setAuthed);
  }, []);

  useEffect(() => {
    if (focus === "reply" && authed === true) {
      const id = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(id);
    }
  }, [focus, authed]);

  const createReply = useCreateReply(postId);

  // hook for post likes
  const togglePostLike = useToggleLike({ postId, invalidateKey: ["post", postId] });

  const patchFeedEverywhere = useCallback(
    (nextLiked: boolean) => {
      // Patch post cache (detail)
      qc.setQueryData(["post", postId], (old: any) => {
        if (!old?.post) return old;
        const cur = !!old.post.likedByMe;
        const delta = nextLiked === cur ? 0 : nextLiked ? 1 : -1;

        return {
          ...old,
          post: {
            ...old.post,
            likedByMe: nextLiked,
            counts: { ...old.post.counts, likes: Math.max(0, (old.post.counts?.likes ?? 0) + delta) },
          },
        };
      });

      // Patch ALL feed caches (["feed", <filter>]) because your feed is infinite + filter-based.
      const feedQueries = qc.getQueryCache().findAll({ queryKey: ["feed"] });
      for (const q of feedQueries) {
        const key = q.queryKey as unknown[];
        // only touch keys like ["feed", "ALL" | "PERSONAL" | ...]
        if (!Array.isArray(key) || key.length < 2) continue;

        qc.setQueryData(key, (old: unknown) => {
          const o = old as InfiniteData<FeedPage> | undefined;
          if (!o?.pages) return old;

          const nextPages = o.pages.map((pg) => {
            const nextItems = (pg.items ?? []).map((it: any) => {
              if (!it || it.id !== postId) return it;
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
      }
    },
    [qc, postId]
  );

  const onLikePost = useCallback(async () => {
    if (!validPostId || !post) return;

    const ok = await requireAuth(`/post/${postId}`);
    if (!ok) return;

    const currentLiked = !!post.likedByMe;
    const nextLiked = !currentLiked;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // optimistic
    patchFeedEverywhere(nextLiked);

    try {
      // IMPORTANT: hook expects CURRENT state
      await togglePostLike.mutateAsync(currentLiked);

      await qc.invalidateQueries({ queryKey: ["post", postId] });
      await qc.invalidateQueries({ queryKey: ["feed"] });
    } catch {
      await qc.invalidateQueries({ queryKey: ["post", postId] });
      await qc.invalidateQueries({ queryKey: ["feed"] });
    }
  }, [validPostId, post, postId, togglePostLike, patchFeedEverywhere, qc]);

  const toggleReplyLike = useMutation({
    mutationFn: async (vars: { replyId: string; liked: boolean }) => {
      if (vars.liked) {
        return apiFetch(`/api/likes`, { method: "DELETE", json: { replyId: vars.replyId } });
      }
      return apiFetch(`/api/likes`, { method: "POST", json: { replyId: vars.replyId } });
    },
    onMutate: async (vars) => {
      const nextLiked = !vars.liked;

      qc.setQueryData(["post", postId], (old: any) => {
        if (!old?.replies) return old;

        const nextReplies = old.replies.map((r: any) => {
          if (!r || r.id !== vars.replyId) return r;
          const cur = !!r.likedByMe;
          const delta = nextLiked === cur ? 0 : nextLiked ? 1 : -1;
          return {
            ...r,
            likedByMe: nextLiked,
            counts: { ...r.counts, likes: Math.max(0, (r.counts?.likes ?? 0) + delta) },
          };
        });

        return { ...old, replies: nextReplies };
      });

      return { prev: qc.getQueryData(["post", postId]) };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["post", postId], ctx.prev);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["post", postId] });
    },
  });

  const onLikeReply = useCallback(
    async (replyId: string, currentLiked: boolean) => {
      if (!validPostId) return;

      const ok = await requireAuth(`/post/${postId}`);
      if (!ok) return;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await toggleReplyLike.mutateAsync({ replyId, liked: currentLiked });
    },
    [validPostId, postId, toggleReplyLike]
  );

  const canSend = reply.trim().length >= 2 && !createReply.isPending;

  const onSend = useCallback(async () => {
    if (!validPostId) return;

    const ok = await requireAuth(`/post/${postId}`);
    if (!ok) return;

    const text = reply.trim();
    if (!text) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await createReply.mutateAsync(text);
    setReply("");
    await qc.invalidateQueries({ queryKey: ["post", postId] });
    await qc.invalidateQueries({ queryKey: ["feed"] });
  }, [validPostId, postId, reply, createReply, qc]);

  const showInvalid = !validPostId;

  const Header = useMemo(() => {
    if (!post) return null;

    const label = categoryLabel(post.category);
    const sizing = titleSizing(post.body);

    return (
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: t.space[16] }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => ({
              paddingVertical: 8,
              paddingRight: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="chevron-back" size={18} color={t.color.textMuted} />
              <AppText variant="body" weight="semibold" style={{ color: t.color.textMuted }}>
                Back
              </AppText>
            </View>
          </Pressable>

          <AppText variant="body" weight="semibold" style={{ color: t.color.text, letterSpacing: -0.2 }}>
            Post
          </AppText>

          <View style={{ width: 44 }} />
        </View>

        <View
          style={{
            marginTop: 10,
            borderRadius: t.radius.xl,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: withAlpha(t.color.border, 0.9),
            backgroundColor: withAlpha(t.color.surface, 0.96),
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[withAlpha(tint, 0.55), withAlpha(tint, 0.18), withAlpha(t.color.surface, 0.0)]}
            start={{ x: 0.2, y: 0.0 }}
            end={{ x: 0.9, y: 1.0 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <TinyPill text={label} />
              <IconChip
                icon={post.likedByMe ? "heart" : "heart-outline"}
                label={`${post.counts.likes}`}
                onPress={onLikePost}
                active={post.likedByMe}
              />
            </View>

            <AppText
              variant="headline"
              weight="semibold"
              style={{
                marginTop: 12,
                color: t.color.text,
                letterSpacing: -0.3,
                fontSize: sizing.fontSize,
                lineHeight: sizing.lineHeight,
              }}
            >
              {post.body}
            </AppText>

            <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <AppText variant="muted" weight="medium" style={{ color: t.color.textMuted }}>
                @{post.author.username}
              </AppText>
              <AppText variant="muted" weight="regular" style={{ color: t.color.textMuted }}>
                {post.counts.replies} {post.counts.replies === 1 ? "reply" : "replies"}
              </AppText>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <AppText variant="title" weight="semibold" style={{ letterSpacing: -0.2 }}>
            Replies
          </AppText>
          <AppText variant="muted" weight="regular">
            Be helpful.
          </AppText>
        </View>
      </View>
    );
  }, [post, t, insets.top, router, tint, onLikePost]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
    >
      {showInvalid ? (
        <View style={{ flex: 1, justifyContent: "center", padding: t.space[16] }}>
          <AppText variant="title" weight="semibold" style={{ color: t.color.text }}>
            Couldn’t open post
          </AppText>
          <AppText variant="muted" weight="regular" style={{ marginTop: 8 }}>
            This link looks broken.
          </AppText>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              marginTop: 14,
              alignSelf: "flex-start",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: t.radius.pill,
              backgroundColor: withAlpha(t.color.surface, 0.92),
              borderWidth: 1,
              borderColor: withAlpha(t.color.border, 0.9),
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <AppText variant="body" weight="semibold" style={{ color: t.color.text }}>
              Go back
            </AppText>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, padding: t.space[16], justifyContent: "center" }}>
          <AppText variant="title" weight="semibold" style={{ color: t.color.text }}>
            Couldn’t load post
          </AppText>
          <AppText variant="muted" weight="regular" style={{ marginTop: 8 }}>
            {(error as Error).message}
          </AppText>

          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => ({
              marginTop: 14,
              alignSelf: "flex-start",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: t.radius.pill,
              backgroundColor: withAlpha(t.color.surface, 0.92),
              borderWidth: 1,
              borderColor: withAlpha(t.color.border, 0.9),
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <AppText variant="body" weight="semibold" style={{ color: t.color.text }}>
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlashList
            data={replies}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={Header}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: t.space[16], paddingTop: 10 }}>
                <View
                  style={{
                    borderRadius: t.radius.xl,
                    borderWidth: 1,
                    borderColor: withAlpha(t.color.border, 0.9),
                    backgroundColor: withAlpha(t.color.surface, 0.96),
                    padding: 14,
                  }}
                >
                  <AppText
                    variant="body"
                    weight="regular"
                    style={{
                      color: t.color.text,
                      letterSpacing: -0.15,
                      lineHeight: 22,
                    }}
                  >
                    {item.body}
                  </AppText>

                  <View
                    style={{
                      marginTop: 10,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <AppText variant="muted" weight="medium" style={{ color: t.color.textMuted }}>
                      @{item.author.username}
                    </AppText>

                    <IconChip
                      icon={item.likedByMe ? "heart" : "heart-outline"}
                      label={`${item.counts.likes}`}
                      active={item.likedByMe}
                      onPress={() => onLikeReply(item.id, item.likedByMe)}
                    />
                  </View>
                </View>
              </View>
            )}
          />

          {authed === true ? (
            <View
              style={{
                paddingTop: 10,
                paddingBottom: Math.max(12, insets.bottom + 10),
                paddingHorizontal: t.space[12],
                backgroundColor: withAlpha(t.color.bg, 0.98),
                borderTopWidth: 1,
                borderTopColor: withAlpha(t.color.border, 0.9),
              }}
            >
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <TextInput
                  ref={inputRef}
                  value={reply}
                  onChangeText={setReply}
                  placeholder="Write a reply…"
                  placeholderTextColor={t.color.textMuted}
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (canSend) onSend();
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: withAlpha(t.color.surface, 0.96),
                    borderWidth: 1,
                    borderColor: withAlpha(t.color.border, 0.9),
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    color: t.color.text,
                    fontSize: t.text.md,
                    fontWeight: "500",
                    letterSpacing: -0.15,
                  }}
                />

                <Pressable
                  onPress={onSend}
                  disabled={!canSend}
                  style={({ pressed }) => ({
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderRadius: 999,
                    backgroundColor: canSend ? t.color.accent : withAlpha(t.color.border, 0.9),
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <AppText variant="button" weight="semibold" style={{ color: t.color.textOnAccent }}>
                    {createReply.isPending ? "…" : "Send"}
                  </AppText>
                </Pressable>
              </View>
            </View>
          ) : authed === false ? (
            <View
              style={{
                paddingTop: 10,
                paddingBottom: Math.max(12, insets.bottom + 10),
                paddingHorizontal: t.space[16],
                backgroundColor: withAlpha(t.color.bg, 0.98),
                borderTopWidth: 1,
                borderTopColor: withAlpha(t.color.border, 0.9),
              }}
            >
              <AppText variant="muted" weight="regular" style={{ textAlign: "center" }}>
                Sign in to reply or like.
              </AppText>

              <Pressable
                onPress={() => requireAuth(`/post/${postId}`)}
                style={({ pressed }) => ({
                  marginTop: 10,
                  alignSelf: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: withAlpha(t.color.surface, 0.92),
                  borderWidth: 1,
                  borderColor: withAlpha(t.color.border, 0.9),
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <AppText variant="body" weight="semibold" style={{ color: t.color.accent }}>
                  Sign in
                </AppText>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
