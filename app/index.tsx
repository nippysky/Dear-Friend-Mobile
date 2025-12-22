import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useFeed } from "../src/hooks/useFeed";
import { useTheme } from "../src/theme/ThemeProvider";

type FeedItem = {
  id: string;
  category: "PERSONAL" | "RELATIONSHIP" | "CAREER";
  body: string;
  createdAt: string;
  author: { id: string; username: string; displayName: string | null };
  counts: { replies: number; likes: number };
  pinnedReplyId: string | null;
};

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

function AskFab() {
  const { t } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/(modals)/ask")}
      style={{
        position: "absolute",
        bottom: 22,
        alignSelf: "center",
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: t.radius.pill,
        backgroundColor: t.color.accent,
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}
    >
      <Text
        style={{
          color: t.color.textOnAccent,
          fontSize: t.text.md,
          fontWeight: "800",
          letterSpacing: -0.2,
        }}
      >
        Ask
      </Text>
    </Pressable>
  );
}

function TopBar() {
  const { t } = useTheme();
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingTop: Platform.OS === "ios" ? 54 : 24,
        paddingBottom: 10,
        paddingHorizontal: t.space[16],
      }}
    >
      <Text
        style={{
          fontSize: t.text.xl,
          fontWeight: "900",
          color: t.color.text,
          letterSpacing: -0.6,
        }}
      >
        Dear Friend
      </Text>
    </View>
  );
}

function ReelCard({ item, height }: { item: FeedItem; height: number }) {
  const { t } = useTheme();
  const label = categoryLabel(item.category);

  return (
    <View
      style={{
        height,
        paddingHorizontal: t.space[16],
        paddingTop: Platform.OS === "ios" ? 96 : 76, // account for TopBar
        paddingBottom: 110, // account for Ask button
        justifyContent: "center",
        backgroundColor: t.color.bg,
      }}
    >
      {/* Card */}
      <View
        style={{
          backgroundColor: t.color.surface,
          borderWidth: 1,
          borderColor: t.color.border,
          borderRadius: t.radius.xl,
          padding: t.space[20],
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 2,
        }}
      >
        {/* Category pill */}
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: t.radius.pill,
            backgroundColor: t.color.accentSoft,
            borderWidth: 1,
            borderColor: t.color.border,
          }}
        >
          <Text
            style={{
              color: t.color.text,
              fontSize: t.text.xs,
              fontWeight: "800",
              letterSpacing: -0.2,
            }}
          >
            {label}
          </Text>
        </View>

        {/* Main text */}
        <Text
          style={{
            marginTop: t.space[16],
            fontSize: t.text["2xl"],
            lineHeight: t.line["2xl"],
            fontWeight: "900",
            color: t.color.text,
            letterSpacing: -0.8,
          }}
        >
          {item.body}
        </Text>

        {/* Footer */}
        <View
          style={{
            marginTop: t.space[16],
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: t.color.textMuted, fontSize: t.text.sm, fontWeight: "700" }}>
            @{item.author.username}
          </Text>

          <Text style={{ color: t.color.textMuted, fontSize: t.text.sm, fontWeight: "700" }}>
            {item.counts.replies} replies • {item.counts.likes} likes
          </Text>
        </View>
      </View>

      {/* Sub hint */}
      <Text
        style={{
          marginTop: 14,
          textAlign: "center",
          color: t.color.textMuted,
          fontSize: t.text.sm,
          fontWeight: "600",
        }}
      >
        Swipe up for more
      </Text>
    </View>
  );
}

export default function FeedScreen() {
  const { t } = useTheme();
  const { height } = useWindowDimensions();

  const { data, isLoading, isError, error, refetch } = useFeed();

  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <TopBar />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, padding: t.space[16], justifyContent: "center" }}>
          <Text style={{ color: t.color.text, fontWeight: "900", fontSize: t.text.lg }}>
            Couldn’t load feed
          </Text>
          <Text style={{ marginTop: 8, color: t.color.textMuted, fontWeight: "600" }}>
            {(error as Error).message}
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
            <Text style={{ fontWeight: "800", color: t.color.text }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReelCard item={item as FeedItem} height={height} />}
          showsVerticalScrollIndicator={false}
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={height}
          snapToAlignment="start"
          disableIntervalMomentum
          // Preload a bit for smoothness
          drawDistance={height * 2}
          onRefresh={refetch}
          refreshing={false}
          contentContainerStyle={{}}
        />
      )}

      <AskFab />
    </View>
  );
}
