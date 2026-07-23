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

const REPORT_REASONS = ["垃圾广告", "违法违规", "色情低俗", "侵权", "其他"];

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
      Alert.alert("评论失败", error.message);
      return;
    }
    setComments((prev) => [...prev, data as unknown as Comment]);
    setDraft("");
  }

  function deleteComment(commentId: string) {
    Alert.alert("删除评论", "确定删除这条评论吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
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
    Alert.alert("举报这条收藏", "选择举报原因", [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          const { error } = await supabase.from("reports").insert({
            bookmark_id: id,
            reporter_id: viewerId,
            reason,
          });
          Alert.alert(
            error ? "举报失败" : "已收到举报",
            error ? "请稍后重试" : "我们会尽快处理，感谢反馈"
          );
        },
      })),
      { text: "取消", style: "cancel" as const },
    ]);
  }

  function deleteBookmark() {
    Alert.alert("删除收藏", "删除后不可恢复，确定吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("bookmarks")
            .delete()
            .eq("id", id);
          if (error) {
            Alert.alert("删除失败", error.message);
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
        <Stack.Screen options={{ title: "收藏详情" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (missing || !bookmark) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "收藏详情" }} />
        <Text style={{ color: colors.mutedForeground }}>
          收藏不存在或不可见
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
      <Stack.Screen options={{ title: "收藏详情" }} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {bookmark.removed_at ? (
          <View style={[styles.notice, { backgroundColor: colors.accent }]}>
            <Text style={{ color: colors.foreground, fontSize: 13 }}>
              这条收藏因违规已被下架，仅你自己可见。
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
                  {bookmark.is_starred ? "已星标" : "星标"}
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
                  {bookmark.read_at ? "已读" : "标为已读"}
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
                  编辑
                </Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={deleteBookmark} hitSlop={8}>
                <Text style={[styles.actionLink, { color: colors.destructive }]}>
                  删除
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={report} hitSlop={8}>
              <Text
                style={[styles.actionLink, { color: colors.mutedForeground }]}
              >
                举报
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          评论 {comments.length > 0 ? `(${comments.length})` : ""}
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
                {c.author?.display_name ?? c.author?.username ?? "用户"}
              </Text>
              <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
                {timeAgo(c.created_at)}
              </Text>
              {c.user_id === viewerId ? (
                <Pressable onPress={() => deleteComment(c.id)} hitSlop={8}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    删除
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
            还没有评论，说点什么吧
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
          placeholder={viewerId ? "写下你的想法…" : "登录后参与评论"}
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
            发送
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
