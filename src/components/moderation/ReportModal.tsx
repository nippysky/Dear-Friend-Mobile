// src/components/moderation/ReportModal.tsx
import { useTheme } from "@/src/theme/ThemeProvider";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { AppText } from "../ui/AppText";


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

export function ReportModal({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const { t } = useTheme();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = useMemo(() => reason.trim().length >= 2 && reason.trim().length <= 500 && !busy, [reason, busy]);

  const quick = [
    "Harassment / bullying",
    "Hate or abuse",
    "Spam",
    "Threats",
    "Self-harm content",
    "Other",
  ];

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onSubmit(reason.trim());
      setReason("");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 14,
          }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View
              style={{
                borderRadius: t.radius.xl,
                backgroundColor: withAlpha(t.color.surface, 0.98),
                borderWidth: 1,
                borderColor: withAlpha(t.color.border, 0.9),
                overflow: "hidden",
              }}
            >
              <View style={{ padding: 14 }}>
                <AppText variant="title" weight="semibold" style={{ letterSpacing: -0.2 }}>
                  {title}
                </AppText>

                {subtitle ? (
                  <AppText variant="muted" weight="regular" style={{ marginTop: 6, lineHeight: t.line.sm }}>
                    {subtitle}
                  </AppText>
                ) : null}

                <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {quick.map((q) => (
                    <Pressable
                      key={q}
                      onPress={() => setReason(q)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 999,
                        backgroundColor: withAlpha(t.color.surfaceAlt, 0.7),
                        borderWidth: 1,
                        borderColor: withAlpha(t.color.border, 0.9),
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <AppText variant="label" weight="medium" style={{ color: t.color.text }}>
                        {q}
                      </AppText>
                    </Pressable>
                  ))}
                </View>

                <View
                  style={{
                    marginTop: 12,
                    borderRadius: t.radius.lg,
                    borderWidth: 1,
                    borderColor: withAlpha(t.color.border, 0.9),
                    backgroundColor: withAlpha(t.color.surface, 0.98),
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Tell us what’s going on…"
                    placeholderTextColor={withAlpha(t.color.textMuted, 0.65)}
                    multiline
                    style={{
                      minHeight: 84,
                      color: t.color.text,
                      fontSize: t.text.md,
                      fontWeight: "500",
                      letterSpacing: -0.15,
                    }}
                  />
                  <AppText variant="label" weight="regular" style={{ marginTop: 6, color: t.color.textMuted }}>
                    {reason.trim().length}/500
                  </AppText>
                </View>

                <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={onClose}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 48,
                      borderRadius: t.radius.pill,
                      backgroundColor: withAlpha(t.color.surface, 0.9),
                      borderWidth: 1,
                      borderColor: withAlpha(t.color.border, 0.9),
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <AppText variant="button" weight="semibold" style={{ color: t.color.text }}>
                      Cancel
                    </AppText>
                  </Pressable>

                  <Pressable
                    onPress={submit}
                    disabled={!valid}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 48,
                      borderRadius: t.radius.pill,
                      backgroundColor: valid ? t.color.accent : withAlpha(t.color.border, 1),
                      borderWidth: 1,
                      borderColor: valid ? "rgba(255,255,255,0.18)" : withAlpha(t.color.border, 1),
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.95 : 1,
                    })}
                  >
                    <AppText variant="button" weight="semibold" style={{ color: valid ? t.color.textOnAccent : t.color.textMuted }}>
                      {busy ? "Sending…" : "Send report"}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
