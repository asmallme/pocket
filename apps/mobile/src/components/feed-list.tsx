import { t } from "@/i18n";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from "react-native";
import type { BookmarkWithAuthor } from "@pocket/shared";
import { fetchFeed, type FeedOptions } from "@pocket/shared/feed";
import { DOCK_SPACE, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useTabRepress } from "@/lib/tab-repress";
import { BookmarkCard } from "@/components/bookmark-card";

interface Props {
  scope: FeedOptions["scope"];
  tagSlug?: string | null;
  userId?: string;
  includePrivate?: boolean;
  emptyText?: string;
  /** 随列表一起滚动的头部（如个人资料卡） */
  header?: ReactElement;
  /** 底部是否为悬浮 Dock 预留空间（tab 页为 true） */
  dockSpace?: boolean;
  /** 所属 tab 的路由名：重复点按该 tab 时列表滚回顶部 */
  tabName?: string;
  /** 仅未读（scope=user 本人） */
  unreadOnly?: boolean;
  /** 仅星标（scope=user 本人） */
  starredOnly?: boolean;
}

export function FeedList({
  scope,
  tagSlug,
  userId,
  includePrivate,
  emptyText = t.common.empty,
  header,
  dockSpace = false,
  tabName,
  unreadOnly,
  starredOnly,
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
  const listRef = useRef<FlatList<BookmarkWithAuthor>>(null);

  useTabRepress(
    tabName,
    useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, [])
  );

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
          unreadOnly,
          starredOnly,
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
    [scope, tagSlug, userId, viewerId, includePrivate, unreadOnly, starredOnly]
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

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<BookmarkWithAuthor>) => (
      <BookmarkCard
        bookmark={item}
        likedByViewer={likedIds.has(item.id)}
        repostedByViewerId={repostedIds[item.id] ?? null}
      />
    ),
    [likedIds, repostedIds]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator style={{ marginTop: Spacing.xl }} />
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={(b) => b.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      contentContainerStyle={[
        styles.list,
        dockSpace && { paddingBottom: DOCK_SPACE },
      ]}
      // 滚动流畅性：小批量渲染 + 适中窗口 + 回收屏外视图
      initialNumToRender={6}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={40}
      windowSize={9}
      removeClippedSubviews
      scrollIndicatorInsets={
        dockSpace ? { bottom: DOCK_SPACE - Spacing.xl } : undefined
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground }}>
            {error ? t.common.retry : emptyText}
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
    gap: Spacing.md + 2,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
});
