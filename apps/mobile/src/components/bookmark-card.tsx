import { t } from "@/i18n";
import { memo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import type { BookmarkWithAuthor } from "@pocket/shared";
import { CardShadow, R, SerifFont, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { enrichBookmark } from "@/lib/save";
import { hostOf, timeAgo } from "@/lib/format";
import { PressableScale } from "@/components/pressable-scale";

interface Props {
  bookmark: BookmarkWithAuthor;
  likedByViewer: boolean;
  /** viewer 自己已收藏的同内容收藏 id（已转存/已收藏同链接时非空） */
  repostedByViewerId: string | null;
}

function BookmarkCardInner({
  bookmark,
  likedByViewer,
  repostedByViewerId,
}: Props) {
  const colors = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const viewerId = session?.user.id ?? null;

  const [liked, setLiked] = useState(likedByViewer);
  const [likeCount, setLikeCount] = useState(bookmark.like_count ?? 0);
  const [likePending, setLikePending] = useState(false);
  const [ownCopyId, setOwnCopyId] = useState(repostedByViewerId);
  const [repostCount, setRepostCount] = useState(bookmark.repost_count ?? 0);
  const [repostPending, setRepostPending] = useState(false);

  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const author = bookmark.author;
  const name = author?.display_name ?? author?.username ?? t.common.anonymous;
  const isAiSummary = !!bookmark.ai_summary;
  const summary = bookmark.ai_summary ?? bookmark.description;
  const domain = hostOf(bookmark.url);
  const showRepost =
    viewerId !== null &&
    viewerId !== bookmark.user_id &&
    bookmark.is_public &&
    !bookmark.removed_at;

  function requireLogin(): boolean {
    if (viewerId) return false;
    router.push("/login");
    return true;
  }

  async function toggleLike() {
    if (requireLogin() || likePending) return;
    setLikePending(true);
    const next = !liked;
    if (next) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      heartScale.value = withSequence(
        withSpring(1.45, { damping: 9, stiffness: 420 }),
        withSpring(1, { damping: 12, stiffness: 300 })
      );
    }
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const { error } = next
      ? await supabase
          .from("likes")
          .insert({ user_id: viewerId, bookmark_id: bookmark.id })
      : await supabase
          .from("likes")
          .delete()
          .eq("user_id", viewerId!)
          .eq("bookmark_id", bookmark.id);
    if (error) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
    setLikePending(false);
  }

  async function repost() {
    if (requireLogin() || repostPending) return;
    if (ownCopyId) {
      router.push(`/b/${ownCopyId}`);
      return;
    }
    setRepostPending(true);
    const { data, error } = await supabase.rpc("repost_bookmark", {
      p_bookmark_id: bookmark.id,
    });
    setRepostPending(false);
    if (error) {
      Alert.alert(t.detail.repostFailed, error.message);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = data as { id: string; duplicate: boolean };
    setOwnCopyId(result.id);
    if (!result.duplicate) {
      setRepostCount((c) => c + 1);
      if (!bookmark.ai_summary) {
        enrichBookmark(result.id);
      }
    }
  }

  function openUrl() {
    if (bookmark.url) void WebBrowser.openBrowserAsync(bookmark.url);
  }

  return (
    <PressableScale
      scaleTo={0.98}
      style={[
        styles.card,
        CardShadow,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
      onPress={() => router.push(`/b/${bookmark.id}`)}
    >
      <Pressable
        style={styles.header}
        disabled={!author?.username}
        onPress={() => router.push(`/u/${author!.username}`)}
      >
        {author?.avatar_url ? (
          <Image source={{ uri: author.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              {name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.author, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {bookmark.reposted_from !== null || bookmark.source === "repost" ? (
            <Text
              style={[styles.origin, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {t.detail.repostedFrom(bookmark.origin_author?.username ?? t.detail.originDeleted)}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {timeAgo(bookmark.created_at)}
        </Text>
      </Pressable>

      {bookmark.title ? (
        <Pressable onPress={openUrl} disabled={!bookmark.url}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {bookmark.title}
          </Text>
        </Pressable>
      ) : null}

      {bookmark.note ? (
        <View style={[styles.quote, { backgroundColor: colors.accent }]}>
          <View
            style={[styles.quoteBar, { backgroundColor: colors.accentStrong }]}
          />
          <Text style={[styles.quoteText, { color: colors.foreground }]}>
            {bookmark.note}
          </Text>
        </View>
      ) : null}

      {summary ? (
        <View style={styles.summaryRow}>
          {isAiSummary ? (
            <SymbolView
              name="sparkles"
              tintColor={colors.accentStrong}
              size={13}
              style={styles.sparkle}
            />
          ) : null}
          <Text
            style={[
              styles.summary,
              { color: colors.mutedForeground, flex: 1 },
            ]}
            numberOfLines={3}
          >
            {summary}
          </Text>
        </View>
      ) : null}

      {bookmark.cover_image ? (
        <Image
          source={{ uri: bookmark.cover_image }}
          style={[styles.cover, { backgroundColor: colors.muted }]}
          contentFit="cover"
          transition={220}
        />
      ) : null}

      {bookmark.tags && bookmark.tags.length > 0 ? (
        <View style={styles.tags}>
          {bookmark.tags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => router.push(`/tag/${tag.slug}`)}
              style={[styles.tagChip, { backgroundColor: colors.muted }]}
            >
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                #{tag.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Pressable style={styles.action} onPress={toggleLike} hitSlop={8}>
          <Animated.View style={heartStyle}>
            <SymbolView
              name={liked ? "heart.fill" : "heart"}
              tintColor={liked ? colors.like : colors.mutedForeground}
              size={19}
            />
          </Animated.View>
          {likeCount > 0 ? (
            <Text
              style={[
                styles.actionText,
                { color: liked ? colors.like : colors.mutedForeground },
              ]}
            >
              {likeCount}
            </Text>
          ) : null}
        </Pressable>

        <View style={styles.action}>
          <SymbolView
            name="bubble.right"
            tintColor={colors.mutedForeground}
            size={17}
          />
          {(bookmark.comment_count ?? 0) > 0 ? (
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
              {bookmark.comment_count}
            </Text>
          ) : null}
        </View>

        {showRepost ? (
          <Pressable style={styles.action} onPress={repost} hitSlop={8}>
            <SymbolView
              name={ownCopyId ? "bookmark.fill" : "bookmark"}
              tintColor={ownCopyId ? colors.accentStrong : colors.mutedForeground}
              size={17}
            />
            {repostCount > 0 ? (
              <Text
                style={[styles.actionText, { color: colors.mutedForeground }]}
              >
                {repostCount}
              </Text>
            ) : null}
          </Pressable>
        ) : null}

        <View style={{ flex: 1 }} />
        {domain ? (
          <Text style={[styles.domain, { color: colors.mutedForeground }]}>
            {domain}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

/** feed 长列表性能：仅在数据变化时重渲染 */
export const BookmarkCard = memo(BookmarkCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: R.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.sm + 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm + 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  author: {
    fontSize: 14,
    fontWeight: "600",
  },
  origin: {
    fontSize: 12,
    marginTop: 1,
  },
  time: {
    fontSize: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  quote: {
    flexDirection: "row",
    borderRadius: R.sm,
    overflow: "hidden",
  },
  quoteBar: {
    width: 3,
  },
  quoteText: {
    flex: 1,
    fontFamily: SerifFont,
    fontSize: 15,
    lineHeight: 23,
    padding: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 6,
  },
  sparkle: {
    marginTop: 3,
  },
  summary: {
    fontSize: 14,
    lineHeight: 21,
  },
  cover: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: R.md,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  domain: {
    fontSize: 12,
  },
});
