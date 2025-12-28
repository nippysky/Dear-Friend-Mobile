// app/(modals)/ask.tsx
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, ZoomIn, ZoomOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../src/components/ui/AppText";
import { useCreatePost } from "../../src/hooks/useCreatePost";
import { useTheme } from "../../src/theme/ThemeProvider";

type Cat = "PERSONAL" | "RELATIONSHIP" | "CAREER";
type Step = "PICK" | "COMPOSE";

const MAX_POST_CHARS = 280;
const MIN_POST_CHARS = 6;

function placeholderFor(cat: Cat) {
  if (cat === "PERSONAL") return "What’s on your mind?";
  if (cat === "RELATIONSHIP") return "What’s happening with you and someone else?";
  return "What’s going on at work or with your goals?";
}

function catLabel(cat: Cat) {
  if (cat === "PERSONAL") return "Personal";
  if (cat === "RELATIONSHIP") return "Relationship";
  return "Career";
}

function catTint(t: any, cat: Cat) {
  if (cat === "PERSONAL") return t.color.accentSoft;
  if (cat === "RELATIONSHIP") return t.color.blushSoft;
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

function CategoryBubble({
  cat,
  label,
  onPress,
  style,
  delayMs,
}: {
  cat: Cat;
  label: string;
  onPress: () => void;
  style: any;
  delayMs: number;
}) {
  const { t } = useTheme();

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(14).stiffness(180).delay(delayMs)}
      exiting={ZoomOut.duration(140)}
      style={style}
    >
      <Pressable
        onPress={onPress}
        hitSlop={12}
        style={({ pressed }) => ({
          paddingHorizontal: 18,
          paddingVertical: 14,
          borderRadius: 999,
          backgroundColor: withAlpha(catTint(t, cat), 0.72),
          borderWidth: 1,
          borderColor: withAlpha(t.color.border, 0.9),
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          shadowOpacity: 0.10,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 4,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: withAlpha(t.color.surface, 0.85),
            borderWidth: 1,
            borderColor: withAlpha(t.color.border, 0.85),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={
              cat === "PERSONAL"
                ? "sparkles-outline"
                : cat === "RELATIONSHIP"
                ? "people-outline"
                : "briefcase-outline"
            }
            size={16}
            color={t.color.text}
          />
        </View>

        <AppText variant="button" weight="semibold" style={{ color: t.color.text, letterSpacing: -0.15 }}>
          {label}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

export default function AskModal() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const createPost = useCreatePost();

  const [step, setStep] = useState<Step>("PICK");
  const [category, setCategory] = useState<Cat>("PERSONAL");
  const [body, setBody] = useState("");
  const [attempted, setAttempted] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const remaining = MAX_POST_CHARS - body.length;

  const trimmed = body.trim();
  const tooShort = attempted && trimmed.length > 0 && trimmed.length < MIN_POST_CHARS;
  const isEmpty = attempted && trimmed.length === 0;

  const canPost = useMemo(() => {
    return trimmed.length >= MIN_POST_CHARS && trimmed.length <= MAX_POST_CHARS && !createPost.isPending;
  }, [trimmed.length, createPost.isPending]);

  useEffect(() => {
    if (step !== "COMPOSE") return;
    const id = setTimeout(() => inputRef.current?.focus(), 220);
    return () => clearTimeout(id);
  }, [step]);

  const goCompose = async (cat: Cat) => {
    Keyboard.dismiss();
    setAttempted(false);
    setCategory(cat);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("COMPOSE");
  };

  const goPick = async () => {
    Keyboard.dismiss();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("PICK");
  };

  const post = async () => {
    setAttempted(true);

    if (!canPost) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await createPost.mutateAsync({ category, body: trimmed });
    await qc.invalidateQueries({ queryKey: ["feed"] });
    router.replace("/" as any);
  };

  const bgTint = withAlpha(catTint(t, category), 0.32);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Pressable onPress={() => Keyboard.dismiss()} style={{ flex: 1 }} accessible={false}>
        <View style={{ flex: 1, paddingTop: insets.top + 10, paddingHorizontal: t.space[16] }}>
          {/* Top bar */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, paddingVertical: 6, paddingHorizontal: 4 })}
            >
              <AppText variant="body" weight="semibold" style={{ color: t.color.textMuted }}>
                Close
              </AppText>
            </Pressable>

            <AppText variant="body" weight="semibold" style={{ color: t.color.text, letterSpacing: -0.2 }}>
              Ask
            </AppText>

            <View style={{ width: 44 }} />
          </View>

          {/* Soft tinted backdrop */}
          <View
            style={{
              position: "absolute",
              top: insets.top,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: bgTint,
              opacity: step === "COMPOSE" ? 1 : 0.22,
            }}
            pointerEvents="none"
          />

          {/* STEP: PICK */}
          {step === "PICK" ? (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={{ flex: 1 }}>
              <View style={{ marginTop: 26 }}>
                <AppText variant="title" weight="semibold" style={{ color: t.color.text, letterSpacing: -0.35 }}>
                  Pick a category
                </AppText>
                <AppText
                  variant="muted"
                  weight="regular"
                  style={{
                    marginTop: 6,
                    maxWidth: 320,
                    lineHeight: t.line.sm,
                  }}
                >
                  Start where it fits. You can always change it later.
                </AppText>
              </View>

              <View style={{ flex: 1, marginTop: 18 }}>
                <CategoryBubble
                  cat="PERSONAL"
                  label="Personal"
                  delayMs={0}
                  onPress={() => goCompose("PERSONAL")}
                  style={{ position: "absolute", top: 40, left: 0 }}
                />

                <CategoryBubble
                  cat="RELATIONSHIP"
                  label="Relationship"
                  delayMs={70}
                  onPress={() => goCompose("RELATIONSHIP")}
                  style={{ position: "absolute", top: 140, right: 0 }}
                />

                <CategoryBubble
                  cat="CAREER"
                  label="Career"
                  delayMs={140}
                  onPress={() => goCompose("CAREER")}
                  style={{ position: "absolute", top: 260, left: 24 }}
                />

                <View
                  style={{
                    position: "absolute",
                    bottom: 18,
                    left: 0,
                    right: 0,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: withAlpha(t.color.surface, 0.9),
                      borderWidth: 1,
                      borderColor: withAlpha(t.color.border, 0.85),
                    }}
                  >
                    <AppText variant="label" weight="medium" style={{ color: t.color.textMuted }}>
                      Tap a bubble to continue
                    </AppText>
                  </View>
                </View>
              </View>
            </Animated.View>
          ) : null}

          {/* STEP: COMPOSE */}
          {step === "COMPOSE" ? (
            <Animated.View
              entering={SlideInDown.duration(150)}
              exiting={SlideOutDown.duration(120)}
              style={{ flex: 1, paddingTop: 18 }}
            >
              {/* Compose header row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Pressable
                  onPress={goPick}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: withAlpha(t.color.surface, 0.92),
                    borderWidth: 1,
                    borderColor: withAlpha(t.color.border, 0.9),
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons name="chevron-back" size={16} color={t.color.textMuted} />
                  <AppText variant="body" weight="semibold" style={{ color: t.color.textMuted }}>
                    Change
                  </AppText>
                </Pressable>

                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: withAlpha(catTint(t, category), 0.55),
                    borderWidth: 1,
                    borderColor: withAlpha(t.color.border, 0.9),
                  }}
                >
                  <AppText variant="label" weight="semibold" style={{ color: t.color.text }}>
                    {catLabel(category)}
                  </AppText>
                </View>
              </View>

              {/* Composer card */}
              <View
                style={{
                  marginTop: 14,
                  backgroundColor: withAlpha(t.color.surface, 0.96),
                  borderWidth: 1,
                  borderColor: withAlpha(t.color.border, 0.9),
                  borderRadius: t.radius.xl,
                  padding: t.space[16],
                  flex: 1,
                }}
              >
                <TextInput
                  ref={inputRef}
                  value={body}
                  onChangeText={(txt) => {
                    setBody(txt);
                    if (attempted) setAttempted(false);
                  }}
                  placeholder={placeholderFor(category)}
                  placeholderTextColor={t.color.textMuted}
                  multiline
                  maxLength={MAX_POST_CHARS}
                  autoFocus
                  showSoftInputOnFocus
                  style={{
                    color: t.color.text,
                    fontSize: t.text.lg, // 18
                    lineHeight: t.line.lg, // 26
                    fontWeight: "500",
                    letterSpacing: -0.15,
                    textAlignVertical: "top",
                    flex: 1,
                    paddingTop: 2,
                  }}
                />

                <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <AppText variant="muted" weight="regular">
                    {body.length}/{MAX_POST_CHARS}
                  </AppText>
                  <AppText variant="muted" weight="regular">
                    {remaining} left
                  </AppText>
                </View>

                {isEmpty || tooShort ? (
                  <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="alert-circle-outline" size={16} color={t.color.blush} />
                    <AppText variant="label" weight="medium" style={{ color: t.color.blush }}>
                      {isEmpty ? "Write something to post." : `Keep it at least ${MIN_POST_CHARS} characters.`}
                    </AppText>
                  </View>
                ) : null}
              </View>

              {/* Post button */}
              <Pressable
                disabled={!canPost}
                onPress={post}
                style={({ pressed }) => ({
                  marginTop: 14,
                  marginBottom: Math.max(14, insets.bottom + 10),
                  paddingVertical: 14,
                  borderRadius: t.radius.pill,
                  backgroundColor: canPost ? t.color.accent : withAlpha(t.color.border, 0.9),
                  alignItems: "center",
                  opacity: pressed ? 0.92 : 1,
                })}
              >
                <AppText variant="button" weight="semibold" style={{ color: t.color.textOnAccent }}>
                  {createPost.isPending ? "Posting..." : "Post"}
                </AppText>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
