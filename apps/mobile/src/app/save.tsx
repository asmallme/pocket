import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import type { UnfurlResult } from "@pocket/shared";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { hostOf } from "@/lib/format";
import {
  findExistingBookmark,
  saveBookmark,
  unfurlViaWeb,
} from "@/lib/save";

function normalizeUrl(raw: string): string | null {
  const text = raw.trim();
  const match = text.match(/https?:\/\/\S+/);
  if (!match) return null;
  try {
    return new URL(match[0]).toString();
  } catch {
    return null;
  }
}

export default function SaveScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  // 分享扩展跳转时带入：/save?sharedUrl=...&sharedText=...
  const params = useLocalSearchParams<{
    sharedUrl?: string;
    sharedText?: string;
  }>();

  const [rawInput, setRawInput] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<UnfurlResult | null>(null);
  const [unfurling, setUnfurling] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyUrl = useCallback(async (candidate: string) => {
    const normalized = normalizeUrl(candidate);
    if (!normalized) return false;
    setRawInput(candidate.trim());
    setUrl(normalized);
    setMeta(null);
    setUnfurling(true);
    const [unfurled, existing] = await Promise.all([
      unfurlViaWeb(normalized),
      findExistingBookmark(normalized),
    ]);
    setMeta(unfurled);
    setExistingId(existing);
    setUnfurling(false);
    return true;
  }, []);

  // 接收分享扩展传参
  useEffect(() => {
    const shared = params.sharedUrl || params.sharedText;
    if (shared) void applyUrl(shared);
  }, [params.sharedUrl, params.sharedText, applyUrl]);

  async function pasteFromClipboard() {
    const text = await Clipboard.getStringAsync();
    if (!text || !(await applyUrl(text))) {
      Alert.alert("剪贴板里没有链接");
    }
  }

  async function handleSave() {
    if (!session) {
      router.push("/login");
      return;
    }
    if (!url) return;
    setSaving(true);
    const tags = tagInput
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);

    const result = await saveBookmark({
      url,
      title: meta?.title ?? url,
      description: meta?.description ?? null,
      cover_image: meta?.image ?? null,
      content_type: "link",
      note: note.trim() || null,
      is_public: isPublic,
      source: params.sharedUrl || params.sharedText ? "ios-share" : "ios",
      tags,
      content: meta?.content ?? null,
    });
    setSaving(false);

    if (result.status === "saved") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (result.status === "saved" || result.status === "duplicate") {
      setRawInput("");
      setUrl(null);
      setMeta(null);
      setNote("");
      setTagInput("");
      setExistingId(null);
      // 用 replace 关掉保存弹层并直达详情
      router.replace(`/b/${result.id}`);
      return;
    }
    if (result.status === "unauthenticated") {
      router.push("/login");
      return;
    }
    Alert.alert("保存失败", result.message);
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      color: colors.foreground,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.urlRow}>
          <TextInput
            style={[...inputStyle, { flex: 1 }]}
            placeholder="粘贴或输入链接"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={rawInput}
            onChangeText={setRawInput}
            onEndEditing={(e) => void applyUrl(e.nativeEvent.text)}
          />
          <Pressable
            style={[styles.pasteButton, { backgroundColor: colors.muted }]}
            onPress={pasteFromClipboard}
          >
            <Text style={{ color: colors.foreground, fontSize: 14 }}>
              粘贴
            </Text>
          </Pressable>
        </View>

        {unfurling ? (
          <View style={[styles.preview, { borderColor: colors.border }]}>
            <ActivityIndicator />
          </View>
        ) : meta && url ? (
          <View
            style={[
              styles.preview,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            {meta.image ? (
              <Image
                source={{ uri: meta.image }}
                style={[styles.previewThumb, { backgroundColor: colors.muted }]}
                contentFit="cover"
              />
            ) : null}
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[styles.previewTitle, { color: colors.foreground }]}
                numberOfLines={2}
              >
                {meta.title ?? url}
              </Text>
              {meta.description ? (
                <Text
                  style={{ color: colors.mutedForeground, fontSize: 12 }}
                  numberOfLines={2}
                >
                  {meta.description}
                </Text>
              ) : null}
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {hostOf(url)}
              </Text>
            </View>
          </View>
        ) : null}

        {existingId ? (
          <Pressable onPress={() => router.push(`/b/${existingId}`)}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              已收藏过这个链接，点击查看 →
            </Text>
          </Pressable>
        ) : null}

        <TextInput
          style={[...inputStyle, styles.noteInput]}
          placeholder="写一句推荐语或金句（可选）"
          placeholderTextColor={colors.mutedForeground}
          value={note}
          onChangeText={setNote}
          multiline
        />

        <TextInput
          style={inputStyle}
          placeholder="标签，逗号分隔（可选）"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          value={tagInput}
          onChangeText={setTagInput}
        />

        <View style={styles.switchRow}>
          <Text style={{ color: colors.foreground, fontSize: 15 }}>
            公开这条收藏
          </Text>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>

        <Pressable
          style={[
            styles.saveButton,
            {
              backgroundColor:
                url && !saving && !unfurling ? colors.primary : colors.muted,
            },
          ]}
          disabled={!url || saving || unfurling}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              style={{
                color:
                  url && !unfurling
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {existingId ? "再收藏一次" : "收藏"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  urlRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  input: {
    height: 48,
    borderRadius: Radius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    fontSize: 15,
  },
  pasteButton: {
    height: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    flexDirection: "row",
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius,
    padding: Spacing.md,
    minHeight: 72,
    alignItems: "center",
  },
  previewThumb: {
    width: 72,
    height: 54,
    borderRadius: Radius - 2,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  noteInput: {
    height: 80,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  saveButton: {
    height: 50,
    borderRadius: Radius,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
});
