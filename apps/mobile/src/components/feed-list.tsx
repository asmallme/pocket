import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BookmarkWithAuthor } from "@pocket/shared";
import { fetchFeed, type FeedOptions } from "@pocket/shared/feed";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { BookmarkCard } from "@/components/bookmark-card";

interface Props {
  scope: FeedOptions["scope"];
  tagSlug?: string | null;
  userId?: string;
  includePrivate?: boolean;
  emptyText?: string;
}

export function FeedList({
  scope,
  tagSlug,
  userId,
  includePrivate,
  emptyText = "还没有内容",
}: Props) {
  const colors = useTheme();
  const { session, ready } = useAuth();
  const viewerId = session?.user.id ?? null;

  const [items, setItems] = useState<BookmarkWithAuthor[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [repostedIds, setRepostedIds] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  // 防止翻页请求乱序覆盖：每次全量刷新递增
  const generation = useRef(0);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more", afterCursor?: string | null) => {
      const gen = mode === "more" ? generation.current : ++generation.current;
      try {
        const page = await fetchFeed(supabase, {
          scope,
          tagSlug: tagSlug ?? null,
          userId,
          viewerId,
          includePrivate,
          cursor: mode === "more" ? afterCursor : null,
        });
        if (gen !== generation.current) return;
        setItems((prev) =>
          mode === "more" ? [...prev, ...page.items] : page.items
        );
        setLikedIds((prev) => {
          const next = mode === "more" ? new Set(prev) : new Set<string>();
          for (const id of page.likedIds) next.add(id);
          return next;
        });
        setRepostedIds((prev) =>
          mode === "more" ? { ...prev, ...page.repostedIds } : page.repostedIds
        );
        setCursor(page.nextCursor);
        setError(false);
      } catch {
        if (gen === generation.current) setError(true);
      }
    },
    [scope, tagSlug, userId, viewerId, includePrivate]
  );

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    void load("initial").finally(() => setLoading(false));
  }, [ready, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load("refresh");
    setRefreshing(false);
  }

  async function onEndReached() {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    await load("more", cursor);
    setLoadingMore(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(b) => b.id}
      renderItem={({ item }) => (
        <BookmarkCard
          bookmark={item}
          likedByViewer={likedIds.has(item.id)}
          repostedByViewerId={repostedIds[item.id] ?? null}
        />
      )}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground }}>
            {error ? "加载失败，下拉重试" : emptyText}
          </Text>
        </View>
      }
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator style={{ marginVertical: Spacing.lg }} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
});
