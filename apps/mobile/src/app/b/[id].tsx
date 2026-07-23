import { t } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import type { BookmarkWithAuthor, Comment } from "@pocket/shared";
import { BOOKMARK_SELECT, fetchTagsForBookmarks } from "@pocket/shared/feed";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/format";
import { BookmarkCard } from "@/components/bookmark-card";

const COMMENT_SELECT =
  "*, author:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)";

const REPORT_REASONS = t.detail.reportReasons;

export default function BookmarkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const viewerId = session?.user.id ?? null;

  const [bookmark, setBookmark] = useState<BookmarkWithAuthor | null>(null);
  const [liked, setLiked] = useState(false);
  const [ownCopyId, setOwnCopyId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("bookmarks")
      .select(BOOKMARK_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (!data) {
      setMissing(true);
      setLoading(false);
      return;
    }
    const typed = data as unknown as BookmarkWithAuthor;

    const [tagMap, commentsRes, likedRes, repostRes] = await Promise.all([
      fetchTagsForBookmarks(supabase, [id]),
      supabase
        .from("comments")
        .select(COMMENT_SELECT)
        .eq("bookmark_id", id)
        .order("created_at", { ascending: true }),
      viewerId
        ? supabase
            .from("likes")
            .select("bookmark_id")
            .eq("bookmark_id", id)
            .eq("user_id", viewerId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      viewerId && viewerId !== typed.user_id
        ? supabase
            .from("bookmarks")
            .select("id")
            .eq("user_id", viewerId)
            .neq("id", id)
            .or(
              typed.url
                ? `reposted_from.eq.${id},url.eq."${typed.url.replaceAll('"', "")}"`
                : `reposted_from.eq.${id}`
            )
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setBookmark({ ...typed, tags: tagMap.get(id) ?? [] });
    setComments((commentsRes.data ?? []) as unknown as Comment[]);
    setLiked(!!likedRes.data);
    setOwnCopyId(repostRes.data?.id ?? null);
    setLoading(false);
  }, [id, viewerId]);

  useEffect(() => {
    void load();
  }, [load]);

  // 从编辑页返回时刷新
  useFocusEffect(
    useCallback(() => {
      if (!loading) void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load])
  );

  async function toggleStar() {
    if (!bookmark) return;
    const next = !bookmark.is_starred;
    setBookmark({ ...bookmark, is_starred: next });
    if (next) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await supabase
      .from("bookmarks")
      .update({ is_starred: next })
      .eq("id", id);
    if (error) setBookmark({ ...bookmark, is_starred: !next });
  }

  async function toggleRead() {
    if (!bookmark) return;
    const next = bookmark.read_at ? null : new Date().toISOString();
    setBookmark({ ...bookmark, read_at: next });
    const { error } = await supabase
      .from("bookmarks")
      .update({ read_at: next })
      .eq("id", id);
    if (error) setBookmark({ ...bookmark, read_at: bookmark.read_at });
  }

  async function postComment() {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ bookmark_id: id, user_id: viewerId, content: trimmed })
      .select(COMMENT_SELECT)
      .single();
    setPosting(false);
    if (error) {
      Alert.alert(t.detail.commentFailed, error.message);
      return;
    }
    setComments((prev) => [...prev, data as unknown as Comment]);
    setDraft("");
  }

  function deleteComment(commentId: string) {
    Alert.alert(t.detail.deleteCommentTitle, t.detail.deleteCommentConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("comments")
            .delete()
            .eq("id", commentId);
          if (!error) {
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          }
        },
      },
    ]);
  }

  function report() {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    Alert.alert(t.detail.reportTitle, t.detail.reportPrompt, [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          const { error } = await supabase.from("reports").insert({
            bookmark_id: id,
            reporter_id: viewerId,
            reason,
          });
          Alert.alert(
            error ? t.detail.reportFailed : t.detail.reportOk,
            error ? t.login.failedHint : t.detail.reportOkHint
          );
        },
      })),
      { text: t.common.cancel, style: "cancel" as const },
    ]);
  }

  function deleteBookmark() {
    Alert.alert(t.detail.deleteTitle, t.detail.deleteConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("bookmarks")
            .delete()
            .eq("id", id);
          if (error) {
            Alert.alert(t.detail.deleteFailed, error.message);
          } else {
            router.back();
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t.detail.title }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (missing || !bookmark) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t.detail.title }} />
        <Text style={{ color: colors.mutedForeground }}>
          {t.detail.notFound}
        </Text>
      </View>
    );
  }

  const isOwner = viewerId === bookmark.user_id;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: t.detail.title }} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {bookmark.removed_at ? (
          <View style={[styles.notice, { backgroundColor: colors.accent }]}>
            <Text style={{ color: colors.foreground, fontSize: 13 }}>
              {t.detail.removedNotice}
            </Text>
          </View>
        ) : null}

        <BookmarkCard
          bookmark={bookmark}
          likedByViewer={liked}
          repostedByViewerId={ownCopyId}
        />

        <View style={styles.actionsRow}>
          {isOwner ? (
            <>
              <Pressable onPress={toggleStar} hitSlop={8} style={styles.ownerAction}>
                <SymbolView
                  name={bookmark.is_starred ? "star.fill" : "star"}
                  tintColor={
                    bookmark.is_starred
                      ? colors.accentStrong
                      : colors.mutedForeground
                  }
                  size={15}
                />
                <Text
                  style={[styles.actionLink, { color: colors.mutedForeground }]}
                >
                  {bookmark.is_starred ? t.detail.starred : t.detail.star}
                </Text>
              </Pressable>
              <Pressable onPress={toggleRead} hitSlop={8} style={styles.ownerAction}>
                <SymbolView
                  name={
                    bookmark.read_at ? "checkmark.circle.fill" : "circle"
                  }
                  tintColor={
                    bookmark.read_at
                      ? colors.accentStrong
                      : colors.mutedForeground
                  }
                  size={15}
                />
                <Text
                  style={[styles.actionLink, { color: colors.mutedForeground }]}
                >
                  {bookmark.read_at ? t.detail.read : t.detail.markRead}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/edit/${id}`)}
                hitSlop={8}
                style={styles.ownerAction}
              >
                <SymbolView
                  name="pencil"
                  tintColor={colors.mutedForeground}
                  size={15}
                />
                <Text
                  style={[styles.actionLink, { color: colors.mutedForeground }]}
                >
                  {t.detail.edit}
                </Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={deleteBookmark} hitSlop={8}>
                <Text style={[styles.actionLink, { color: colors.destructive }]}>
                  {t.common.delete}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={report} hitSlop={8}>
              <Text
                style={[styles.actionLink, { color: colors.mutedForeground }]}
              >
                {t.detail.report}
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {t.detail.comments} {comments.length > 0 ? `()` : ""}
        </Text>

        {comments.map((c) => (
          <View
            key={c.id}
            style={[
              styles.comment,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.commentHeader}>
              {c.author?.avatar_url ? (
                <Image
                  source={{ uri: c.author.avatar_url }}
                  style={styles.commentAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.commentAvatar,
                    { backgroundColor: colors.muted },
                  ]}
                />
              )}
              <Text style={[styles.commentAuthor, { color: colors.foreground }]}>
                {c.author?.display_name ?? c.author?.username ?? t.common.anonymous}
              </Text>
              <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
                {timeAgo(c.created_at)}
              </Text>
              {c.user_id === viewerId ? (
                <Pressable onPress={() => deleteComment(c.id)} hitSlop={8}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    {t.common.delete}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={[styles.commentContent, { color: colors.foreground }]}>
              {c.content}
            </Text>
          </View>
        ))}
        {comments.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            {t.detail.noComments}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.inputBar,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder={viewerId ? t.detail.commentPlaceholder : t.detail.commentPlaceholderGuest}
          placeholderTextColor={colors.mutedForeground}
          value={draft}
          onChangeText={setDraft}
          multiline
          editable={!posting}
        />
        <Pressable
          style={[
            styles.sendButton,
            {
              backgroundColor:
                draft.trim() && !posting ? colors.primary : colors.muted,
            },
          ]}
          disabled={!draft.trim() || posting}
          onPress={postComment}
        >
          <Text
            style={{
              color:
                draft.trim() && !posting
                  ? colors.primaryForeground
                  : colors.mutedForeground,
              fontWeight: "600",
            }}
          >
            {t.detail.send}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  notice: {
    padding: Spacing.md,
    borderRadius: Radius,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  ownerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionLink: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  comment: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  commentAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  commentTime: {
    fontSize: 12,
    flex: 1,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 21,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: Radius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  sendButton: {
    height: 40,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius,
    alignItems: "center",
    justifyContent: "center",
  },
});
