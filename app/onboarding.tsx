// app/onboarding.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../src/components/ui/AppText";
import { setSeenOnboarding } from "../src/lib/onboarding";
import { getTokens } from "../src/lib/session";
import { useTheme } from "../src/theme/ThemeProvider";

function withAlpha(color: string, alpha: number) {
  const a = Math.max(0, Math.min(1, alpha));
  if (!color || typeof color !== "string") return color;
  if (color.startsWith("rgba(") || color.startsWith("rgb(")) return color;
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const expand = (s: string) => s.split("").map((ch) => ch + ch).join("");
    const h = hex.length === 3 ? expand(hex) : hex;
    if (h.length !== 6) return color;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return color;
}

type Slide = {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  mood: "sage" | "blush" | "ink";
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Slide>);

export default function OnboardingScreen() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const slides: Slide[] = useMemo(
    () => [
      {
        icon: "sparkles-outline",
        title: "Ask without pressure",
        body: "Post questions anonymously-ish. Get thoughtful replies. Keep moving.",
        mood: "sage",
      },
      {
        icon: "shield-checkmark-outline",
        title: "Safer by default",
        body: "Report + block tools, calm design, and fewer “drama mechanics”.",
        mood: "ink",
      },
      {
        icon: "chatbubble-ellipses-outline",
        title: "Be helpful",
        body: "Like what helps. Pin the most helpful reply on your own questions.",
        mood: "blush",
      },
    ],
    []
  );

  const listRef = useRef<React.ElementRef<typeof FlatList<Slide>>>(null);

  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(1);

  const bottomPad = Math.max(18, insets.bottom + 16);

  const moodTint = useCallback(
    (m: Slide["mood"]) => {
      if (m === "sage") return t.color.accentSoft ?? t.color.surfaceAlt;
      if (m === "blush") return t.color.blushSoft ?? t.color.surfaceAlt;
      return t.color.surfaceAlt;
    },
    [t]
  );

  const finish = useCallback(async () => {
    await setSeenOnboarding();
    const tokens = await getTokens();
    if (tokens?.access_token) router.replace("/" as any);
    else router.replace("/signin" as any);
  }, [router]);

  const goNext = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      return;
    }

    await finish();
  }, [finish, index, slides.length]);

  const skip = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await finish();
  }, [finish]);

  const onAlready = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setSeenOnboarding();
    router.replace("/signin" as any);
  }, [router]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x || 0;
      const i = Math.round(x / Math.max(1, pageWidth));
      setIndex(Math.max(0, Math.min(slides.length - 1, i)));
    },
    [pageWidth, slides.length]
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      {/* Background wash */}
      <LinearGradient
        colors={[withAlpha(t.color.surfaceAlt, 0.55), withAlpha(t.color.bg, 0.0), t.color.bg]}
        start={{ x: 0.15, y: 0.05 }}
        end={{ x: 0.85, y: 0.95 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Top bar */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: t.space[16],
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ width: 70 }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 10,
              backgroundColor: t.color.text,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={require("../assets/images/android-icon-foreground.png")}
              style={{ width: 18, height: 18, tintColor: t.color.bg }}
              resizeMode="contain"
            />
          </View>

          <AppText variant="body" weight="semibold" style={{ color: t.color.text, letterSpacing: -0.2 }}>
            Dear Friend
          </AppText>
        </View>

        <Pressable
          onPress={skip}
          hitSlop={10}
          style={({ pressed }) => ({
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 999,
            backgroundColor: withAlpha(t.color.surface, 0.92),
            borderWidth: 1,
            borderColor: withAlpha(t.color.border, 0.9),
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <AppText variant="label" weight="semibold" style={{ color: t.color.textMuted }}>
            Skip
          </AppText>
        </Pressable>
      </View>

      {/* Hero slides */}
      <View style={{ flex: 1 }} onLayout={(e) => setPageWidth(e.nativeEvent.layout.width || 1)}>
        <AnimatedFlatList
          ref={listRef}
          data={slides}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: false,
          })}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingBottom: 150, // reserves room so dots never collide with buttons
          }}
          renderItem={({ item, index: i }) => {
            const tint = moodTint(item.mood);

            return (
              <View
                style={{
                  width: pageWidth,
                  paddingHorizontal: t.space[16],
                  paddingTop: 22,
                }}
              >
                {/* soft “blob” behind the hero */}
                <View
                  style={{
                    position: "absolute",
                    top: 40,
                    left: 20,
                    right: 20,
                    height: 280,
                    borderRadius: 48,
                    backgroundColor: withAlpha(tint, 0.58),
                    transform: [{ rotate: i % 2 === 0 ? "-7deg" : "7deg" }],
                    opacity: 0.65,
                  }}
                />

                {/* Hero content (no card) */}
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 22,
                      backgroundColor: withAlpha(t.color.surface, 0.92),
                      borderWidth: 1,
                      borderColor: withAlpha(t.color.border, 0.9),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={item.icon} size={26} color={t.color.text} />
                  </View>

                  <AppText
                    variant="headline"
                    weight="semibold"
                    style={{
                      marginTop: 18,
                      color: t.color.text,
                      letterSpacing: -0.8,
                      fontSize: 34,
                      lineHeight: 40,
                    }}
                  >
                    {item.title}
                  </AppText>

                  <AppText
                    variant="muted"
                    weight="regular"
                    style={{
                      marginTop: 12,
                      color: t.color.textMuted,
                      lineHeight: t.line.md,
                      fontSize: 16,
                    }}
                  >
                    {item.body}
                  </AppText>
                </View>
              </View>
            );
          }}
        />
      </View>

      {/* Bottom controls */}
      <View style={{ paddingHorizontal: t.space[16], paddingBottom: bottomPad }}>
        {/* Dots */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 16, gap: 8 }}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * pageWidth, i * pageWidth, (i + 1) * pageWidth];

            const w = scrollX.interpolate({
              inputRange,
              outputRange: [8, 22, 8],
              extrapolate: "clamp",
            });

            const o = scrollX.interpolate({
              inputRange,
              outputRange: [0.25, 0.9, 0.25],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={i}
                style={{
                  width: w,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: withAlpha(t.color.text, 1),
                  opacity: o,
                }}
              />
            );
          })}
        </View>

        {/* Primary */}
        <Pressable
          onPress={goNext}
          style={({ pressed }) => ({
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
            backgroundColor: t.color.accent,
            opacity: pressed ? 0.92 : 1,
            shadowOpacity: 0.14,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          })}
        >
          <AppText variant="button" weight="semibold" style={{ color: t.color.textOnAccent }}>
            {index === slides.length - 1 ? "Get started" : "Continue"}
          </AppText>
        </Pressable>

        {/* Secondary */}
        <Pressable
          onPress={onAlready}
          style={({ pressed }) => ({
            marginTop: 10,
            borderRadius: 999,
            paddingVertical: 12,
            alignItems: "center",
            backgroundColor: withAlpha(t.color.surface, 0.92),
            borderWidth: 1,
            borderColor: withAlpha(t.color.border, 0.9),
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <AppText variant="button" weight="semibold" style={{ color: t.color.text }}>
            I already have an account
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
