import { t } from "@/i18n";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { fetchTagsForBookmarks } from "@pocket/shared/feed";
import { R, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { replaceBookmarkTags } from "@/lib/save";
import { PressableScale } from "@/components/pressable-scale";

export default function EditBookmarkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const router = useRouter();
  const { session } = useAuth();

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data }, tagMap] = await Promise.all([
        supabase
          .from("bookmarks")
          .select("user_id, title, note, is_public")
          .eq("id", id)
          .maybeSingle(),
        fetchTagsForBookmarks(supabase, [id]),
      ]);
      if (!data || data.user_id !== session?.user.id) {
        router.back();
        return;
      }
      setTitle(data.title ?? "");
      setNote(data.note ?? "");
      setIsPublic(data.is_public);
      setTagInput((tagMap.get(id) ?? []).map((t) => t.name).join(", "));
      setLoading(false);
    })();
  }, [id, session?.user.id, router]);

  async function save() {
    if (saving) return;
    setSaving(true);
    const tags = tagInput
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);

    const { error } = await supabase
      .from("bookmarks")
      .update({
        title: title.trim() || null,
        note: note.trim() || null,
        is_public: isPublic,
      })
      .eq("id", id);
    if (error) {
      setSaving(false);
      Alert.alert(t.edit.failed, error.message);
      return;
    }
    await replaceBookmarkTags(id, tags).catch(() => {});
    setSaving(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      color: colors.foreground,
    },
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t.edit.title }} />
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: t.edit.title }} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {t.edit.labelTitle}
        </Text>
        <TextInput
          style={[...inputStyle, styles.titleInput]}
          placeholder={t.edit.titlePlaceholder}
          placeholderTextColor={colors.mutedForeground}
          value={title}
          onChangeText={setTitle}
          multiline
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {t.edit.labelNote}
        </Text>
        <TextInput
          style={[...inputStyle, styles.noteInput]}
          placeholder={t.edit.notePlaceholder}
          placeholderTextColor={colors.mutedForeground}
          value={note}
          onChangeText={setNote}
          multiline
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {t.edit.labelTags}
        </Text>
        <TextInput
          style={inputStyle}
          placeholder={t.edit.tagsPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          value={tagInput}
          onChangeText={setTagInput}
        />

        <View style={styles.switchRow}>
          <Text style={{ color: colors.foreground, fontSize: 15 }}>
            {t.save.isPublic}
          </Text>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>

        <PressableScale
          haptic
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          disabled={saving}
          onPress={save}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              style={{
                color: colors.primaryForeground,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {t.edit.submit}
            </Text>
          )}
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  label: {
    fontSize: 13,
    marginTop: Spacing.sm,
  },
  input: {
    minHeight: 46,
    borderRadius: R.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  titleInput: {
    minHeight: 60,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  saveButton: {
    height: 50,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
});
