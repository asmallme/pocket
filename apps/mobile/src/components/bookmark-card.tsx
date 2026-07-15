import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { SymbolView } from "expo-symbols";
import type { BookmarkWithAuthor } from "@pocket/shared";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase, WEB_URL } from "@/lib/supabase";
import { hostOf, timeAgo } from "@/lib/format";

interface Props {
  bookmark: BookmarkWithAuthor;
  likedByViewer: boolean;
  /** viewer 自己已收藏的同内容收藏 id（已转存/已收藏同链接时非空） */
  repostedByViewerId: string | null;
}

export function BookmarkCard({
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

  const author = bookmark.author;
  const name = author?.display_name ?? author?.username ?? "匿名";
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
      Alert.alert("转存失败", error.message);
      return;
    }
    const result = data as { id: string; duplicate: boolean };
    setOwnCopyId(result.id);
    if (!result.duplicate) {
      setRepostCount((c) => c + 1);
      if (!bookmark.ai_summary) {
        // 后台补 AI 摘要，失败静默
        fetch(`${WEB_URL}/api/ai/enrich`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookmarkId: result.id }),
        }).catch(() => {});
      }
    }
  }

  function openUrl() {
    if (bookmark.url) void WebBrowser.openBrowserAsync(bookmark.url);
  }

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
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
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              {name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.author, { color: colors.foreground }]}>
          {name}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {timeAgo(bookmark.created_at)}
        </Text>
      </Pressable>

      {bookmark.reposted_from !== null || bookmark.source === "repost" ? (
        <Text style={[styles.origin, { color: colors.mutedForeground }]}>
          转存自 @
          {bookmark.origin_author?.username ?? "（原收藏已删除）"}
        </Text>
      ) : null}

      {bookmark.title ? (
        <Pressable onPress={openUrl} disabled={!bookmark.url}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {bookmark.title}
          </Text>
        </Pressable>
      ) : null}

      {bookmark.note ? (
        <View
          style={[
            styles.quote,
            { backgroundColor: colors.accent, borderRadius: Radius },
          ]}
        >
          <Text style={[styles.quoteText, { color: colors.foreground }]}>
            {bookmark.note}
          </Text>
        </View>
      ) : null}

      {summary ? (
        <Text
          style={[styles.summary, { color: colors.mutedForeground }]}
          numberOfLines={3}
        >
          {summary}
        </Text>
      ) : null}

      {bookmark.cover_image ? (
        <Image
          source={{ uri: bookmark.cover_image }}
          style={[styles.cover, { backgroundColor: colors.muted }]}
          contentFit="cover"
          transition={150}
        />
      ) : null}

      {bookmark.tags && bookmark.tags.length > 0 ? (
        <View style={styles.tags}>
          {bookmark.tags.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => router.push(`/tag/${t.slug}`)}
              style={[styles.tagChip, { backgroundColor: colors.muted }]}
            >
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                #{t.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Pressable style={styles.action} onPress={toggleLike} hitSlop={8}>
          <SymbolView
            name={liked ? "heart.fill" : "heart"}
            tintColor={liked ? "#E0245E" : colors.mutedForeground}
            size={18}
          />
          {likeCount > 0 && (
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
              {likeCount}
            </Text>
          )}
        </Pressable>

        <View style={styles.action}>
          <SymbolView
            name="bubble.right"
            tintColor={colors.mutedForeground}
            size={17}
          />
          {(bookmark.comment_count ?? 0) > 0 && (
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
              {bookmark.comment_count}
            </Text>
          )}
        </View>

        {showRepost ? (
          <Pressable style={styles.action} onPress={repost} hitSlop={8}>
            <SymbolView
              name={ownCopyId ? "bookmark.fill" : "bookmark"}
              tintColor={ownCopyId ? colors.foreground : colors.mutedForeground}
              size={17}
            />
            {repostCount > 0 && (
              <Text
                style={[styles.actionText, { color: colors.mutedForeground }]}
              >
                {repostCount}
              </Text>
            )}
          </Pressable>
        ) : null}

        <View style={{ flex: 1 }} />
        {domain ? (
          <Text style={[styles.domain, { color: colors.mutedForeground }]}>
            {domain}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  author: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: "auto",
  },
  origin: {
    fontSize: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  quote: {
    padding: Spacing.md,
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 21,
    fontStyle: "italic",
  },
  summary: {
    fontSize: 14,
    lineHeight: 21,
  },
  cover: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: Radius,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs + 2,
  },
  tagChip: {
    paddingHorizontal: Spacing.sm,
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
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: 13,
  },
  domain: {
    fontSize: 12,
  },
});
