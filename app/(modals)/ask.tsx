import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useCreatePost } from "../../src/hooks/useCreatePost";
import { useTheme } from "../../src/theme/ThemeProvider";

type Cat = "PERSONAL" | "RELATIONSHIP" | "CAREER";

export default function AskModal() {
  const { t } = useTheme();
  const router = useRouter();
  const createPost = useCreatePost();

  const [category, setCategory] = useState<Cat>("PERSONAL");
  const [body, setBody] = useState("");

  const canPost = useMemo(() => body.trim().length >= 6 && !createPost.isPending, [body, createPost.isPending]);

  const Bubble = ({ c, label }: { c: Cat; label: string }) => {
    const active = category === c;
    return (
      <Pressable
        onPress={() => setCategory(c)}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: t.radius.pill,
          backgroundColor: active ? t.color.accentSoft : t.color.surface,
          borderWidth: 1,
          borderColor: active ? t.color.accent : t.color.border,
        }}
      >
        <Text style={{ fontWeight: "700", color: t.color.text }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ paddingTop: 18, paddingHorizontal: t.space[16], flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: t.color.textMuted, fontWeight: "700" }}>Close</Text>
          </Pressable>
          <Text style={{ color: t.color.text, fontWeight: "800", fontSize: t.text.lg }}>Ask</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
          <Bubble c="PERSONAL" label="Personal" />
          <Bubble c="RELATIONSHIP" label="Relationship" />
          <Bubble c="CAREER" label="Career" />
        </View>

        <View
          style={{
            marginTop: 16,
            backgroundColor: t.color.surface,
            borderWidth: 1,
            borderColor: t.color.border,
            borderRadius: t.radius.xl,
            padding: t.space[16],
            flex: 1,
          }}
        >
          <Text style={{ color: t.color.textMuted, fontSize: t.text.sm, marginBottom: 8 }}>
            Keep it short, clear, and kind.
          </Text>

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="What’s on your mind?"
            placeholderTextColor={t.color.textMuted}
            multiline
            style={{
              color: t.color.text,
              fontSize: t.text.md,
              lineHeight: t.line.md,
              minHeight: 160,
              textAlignVertical: "top",
            }}
          />
        </View>

        <Pressable
          disabled={!canPost}
          onPress={async () => {
            const text = body.trim();
            await createPost.mutateAsync({ category, body: text });
            router.back();
          }}
          style={{
            marginTop: 14,
            marginBottom: 18,
            paddingVertical: 14,
            borderRadius: t.radius.pill,
            backgroundColor: canPost ? t.color.accent : t.color.border,
            alignItems: "center",
          }}
        >
          <Text style={{ color: t.color.textOnAccent, fontWeight: "800", fontSize: t.text.md }}>
            {createPost.isPending ? "Posting..." : "Post"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
