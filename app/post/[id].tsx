// app/post/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCreateReply } from "../../src/hooks/useCreateReply";
import { usePost } from "../../src/hooks/usePost";
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
  const len = body.trim().length;
  if (len <= 70) return { fontSize: 24, lineHeight: 30, fontWeight: "800" as const };
  if (len <= 140) return { fontSize: 21, lineHeight: 27, fontWeight: "800" as const };
  if (len <= 280) return { fontSize: 19, lineHeight: 25, fontWeight: "800" as const };
  if (len <= 520) return { fontSize: 17, lineHeight: 23, fontWeight: "800" as const };
  return { fontSize: 16, lineHeight: 22, fontWeight: "800" as const };
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
      <Text style={{ color: t.color.textMuted, fontSize: t.text.xs, fontWeight: "650" as any }}>{text}</Text>
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
      <Text style={{ color: t.color.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function PinnedTag() {
  const { t } = useTheme();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: withAlpha(t.color.blushSoft, 0.9),
        borderWidth: 1,
        borderColor: withAlpha(t.color.border, 0.9),
        marginBottom: 10,
      }}
    >
      <Text style={{ color: t.color.text, fontWeight: "800" }}>Most Helpful</Text>
    </View>
  );
}

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
  const post = data?.post;
  const replies = data?.replies ?? [];

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

  const tint = post ? categoryTint(t, post.category) : t.color.bg;

  // ✅ generalized like mutations
  const togglePostLike = useMutation({
    mutationFn: async (vars: { postId: string; liked: boolean }) => {
      return apiFetch(`/api/likes`, {
        method: vars.liked ? "DELETE" : "POST",
        json: { postId: vars.postId },
      });
    },
    onError: async () => {
      await qc.invalidateQueries({ queryKey: ["post", postId] });
      await qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["post", postId] });
      await qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const toggleReplyLike = useMutation({
    mutationFn: async (vars: { replyId: string; liked: boolean }) => {
      return apiFetch(`/api/likes`, {
        method: vars.liked ? "DELETE" : "POST",
        json: { replyId: vars.replyId },
      });
    },
    onError: async () => {
      await qc.invalidateQueries({ queryKey: ["post", postId] });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["post", postId] });
    },
  });

  const patchPostCaches = useCallback(
    (nextLiked: boolean) => {
      // patch post detail
      qc.setQueryData(["post", postId], (old: any) => {
        if (!old?.post) return old;
        const cur = !!old.post.likedByMe;
        const delta = nextLiked === cur ? 0 : nextLiked ? 1 : -1;

        return {
          ...old,
          post: {
            ...old.post,
            likedByMe: nextLiked,
            counts: {
              ...old.post.counts,
              likes: Math.max(0, (old.post.counts?.likes ?? 0) + delta),
            },
          },
        };
      });

      // patch feed snapshot too (keeps screens in sync)
      qc.setQueryData(["feed"], (old: any) => {
        if (!old?.items) return old;
        const nextItems = old.items.map((it: any) => {
          if (!it || it.id !== postId) return it;
          const cur = !!it.likedByMe;
          const delta = nextLiked === cur ? 0 : nextLiked ? 1 : -1;

          return {
            ...it,
            likedByMe: nextLiked,
            counts: { ...it.counts, likes: Math.max(0, (it.counts?.likes ?? 0) + delta) },
          };
        });
        return { ...old, items: nextItems };
      });
    },
    [qc, postId]
  );

  const patchReplyCache = useCallback(
    (replyId: string, nextLiked: boolean) => {
      qc.setQueryData(["post", postId], (old: any) => {
        if (!old?.replies) return old;
        const nextReplies = old.replies.map((r: any) => {
          if (!r || r.id !== replyId) return r;
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
    patchPostCaches(nextLiked);

    try {
      await togglePostLike.mutateAsync({ postId, liked: currentLiked });
    } catch {
      // onError invalidates
    }
  }, [validPostId, postId, post, patchPostCaches, togglePostLike]);

  const onLikeReply = useCallback(
    async (replyId: string, currentLiked: boolean) => {
      if (!validPostId) return;

      const ok = await requireAuth(`/post/${postId}`);
      if (!ok) return;

      const nextLiked = !currentLiked;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      patchReplyCache(replyId, nextLiked);

      try {
        await toggleReplyLike.mutateAsync({ replyId, liked: currentLiked });
      } catch {
        // onError invalidates
      }
    },
    [validPostId, postId, patchReplyCache, toggleReplyLike]
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
  }, [validPostId, postId, reply, createReply]);

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
              <Text style={{ color: t.color.textMuted, fontWeight: "700" }}>Back</Text>
            </View>
          </Pressable>

          <Text style={{ color: t.color.text, fontWeight: "800", fontSize: t.text.md, letterSpacing: -0.2 }}>
            Post
          </Text>

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
                active={!!post.likedByMe}
              />
            </View>

            <Text
              style={{
                marginTop: 12,
                color: t.color.text,
                letterSpacing: -0.3,
                fontSize: sizing.fontSize,
                lineHeight: sizing.lineHeight,
                fontWeight: sizing.fontWeight,
              }}
            >
              {post.body}
            </Text>

            <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: t.color.textMuted, fontWeight: "650" as any }}>
                @{post.author.username}
              </Text>
              <Text style={{ color: t.color.textMuted, fontWeight: "650" as any }}>
                {post.counts.replies} {post.counts.replies === 1 ? "reply" : "replies"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={{ color: t.color.text, fontWeight: "800", letterSpacing: -0.2 }}>Replies</Text>
          <Text style={{ color: t.color.textMuted, fontWeight: "600" }}>Be helpful.</Text>
        </View>
      </View>
    );
  }, [post, t, insets.top, router, tint, onLikePost]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 10 : 0}
    >
      {showInvalid ? (
        <View style={{ flex: 1, justifyContent: "center", padding: t.space[16] }}>
          <Text style={{ color: t.color.text, fontWeight: "800", fontSize: t.text.lg }}>Couldn’t open post</Text>
          <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "600" }}>This link looks broken.</Text>

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
            <Text style={{ color: t.color.text, fontWeight: "800" }}>Go back</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, padding: t.space[16], justifyContent: "center" }}>
          <Text style={{ color: t.color.text, fontWeight: "800" }}>Couldn’t load post</Text>
          <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "600" }}>
            {(error as Error).message}
          </Text>

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
            <Text style={{ color: t.color.text, fontWeight: "800" }}>Retry</Text>
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
                  {item.isPinned ? <PinnedTag /> : null}

                  <Text style={{ color: t.color.text, fontWeight: "700", fontSize: 16, lineHeight: 22, letterSpacing: -0.2 }}>
                    {item.body}
                  </Text>

                  <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: t.color.textMuted, fontWeight: "650" as any }}>
                      @{item.author.username}
                    </Text>

                    <IconChip
                      icon={item.likedByMe ? "heart" : "heart-outline"}
                      label={`${item.counts.likes}`}
                      active={!!item.likedByMe}
                      onPress={() => onLikeReply(item.id, !!item.likedByMe)}
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
                    fontWeight: "650" as any,
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
                  <Text style={{ color: t.color.textOnAccent, fontWeight: "900" }}>
                    {createReply.isPending ? "…" : "Send"}
                  </Text>
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
              <Text style={{ color: t.color.textMuted, fontWeight: "600", textAlign: "center" }}>
                Sign in to reply or like.
              </Text>

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
                <Text style={{ color: t.color.accent, fontWeight: "800" }}>Sign in</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
