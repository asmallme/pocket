import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookmarkWithAuthor, Tag } from "./index";

export const PAGE_SIZE = 20;

export interface FeedPage {
  items: BookmarkWithAuthor[];
  nextCursor: string | null;
  likedIds: string[];
  /** feed 内收藏 id → viewer 自己已收藏的同内容收藏 id */
  repostedIds: Record<string, string>;
}

export const BOOKMARK_SELECT =
  "*, author:profiles!bookmarks_user_id_fkey(id, username, display_name, avatar_url), origin_author:profiles!bookmarks_reposted_from_user_id_fkey(id, username, display_name, avatar_url)";

export interface FeedOptions {
  scope: "global" | "following" | "user" | "tag" | "subscribed_tags";
  cursor?: string | null;
  userId?: string;
  viewerId?: string | null;
  includePrivate?: boolean;
  tagSlug?: string | null;
  /** 仅未读（read_at 为空），限 scope=user 本人视角 */
  unreadOnly?: boolean;
  /** 仅星标，限 scope=user 本人视角 */
  starredOnly?: boolean;
}

export async function fetchTagsForBookmarks(
  supabase: SupabaseClient,
  bookmarkIds: string[]
): Promise<Map<string, Tag[]>> {
  const map = new Map<string, Tag[]>();
  if (bookmarkIds.length === 0) return map;

  const { data } = await supabase
    .from("bookmark_tags")
    .select("bookmark_id, tag:tags(id, name, slug)")
    .in("bookmark_id", bookmarkIds);

  for (const row of data ?? []) {
    const bid = row.bookmark_id as string;
    const tag = (row as unknown as { tag: Tag | Tag[] }).tag;
    const tags = Array.isArray(tag) ? tag : tag ? [tag] : [];
    for (const t of tags) {
      if (!t) continue;
      const list = map.get(bid) ?? [];
      list.push(t);
      map.set(bid, list);
    }
  }
  return map;
}

/** viewer 拉黑的用户 id 集合（App Store UGC 合规：feed 中过滤其内容）。 */
async function fetchBlockedIds(
  supabase: SupabaseClient,
  viewerId: string | null
): Promise<Set<string>> {
  if (!viewerId) return new Set();
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", viewerId);
  return new Set((data ?? []).map((b) => b.blocked_id));
}

export async function fetchFeed(
  supabase: SupabaseClient,
  options: FeedOptions
): Promise<FeedPage> {
  const emptyPage: FeedPage = {
    items: [],
    nextCursor: null,
    likedIds: [],
    repostedIds: {},
  };

  let bookmarkIdsFilter: string[] | null = null;
  if (options.scope === "tag" && options.tagSlug) {
    const { data: tag } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", options.tagSlug)
      .maybeSingle();
    if (!tag) return emptyPage;
    const { data: links } = await supabase
      .from("bookmark_tags")
      .select("bookmark_id")
      .eq("tag_id", tag.id);
    bookmarkIdsFilter = (links ?? []).map((l) => l.bookmark_id);
    if (bookmarkIdsFilter.length === 0) return emptyPage;
  } else if (options.scope === "subscribed_tags") {
    if (!options.viewerId) return emptyPage;
    const { data: subs } = await supabase
      .from("tag_subscriptions")
      .select("tag_id")
      .eq("user_id", options.viewerId);
    const tagIds = (subs ?? []).map((s) => s.tag_id);
    if (tagIds.length === 0) return emptyPage;
    const { data: links } = await supabase
      .from("bookmark_tags")
      .select("bookmark_id")
      .in("tag_id", tagIds);
    bookmarkIdsFilter = [...new Set((links ?? []).map((l) => l.bookmark_id))];
    if (bookmarkIdsFilter.length === 0) return emptyPage;
  }

  let query = supabase
    .from("bookmarks")
    .select(BOOKMARK_SELECT)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (bookmarkIdsFilter) {
    query = query.in("id", bookmarkIdsFilter).eq("is_public", true).is("removed_at", null);
  } else if (options.scope === "following") {
    if (!options.viewerId) return emptyPage;
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", options.viewerId);
    const followingIds = (follows ?? []).map((f) => f.following_id);
    if (followingIds.length === 0) return emptyPage;
    query = query.in("user_id", followingIds).eq("is_public", true).is("removed_at", null);
  } else if (options.scope === "user") {
    query = query.eq("user_id", options.userId!);
    if (!options.includePrivate) {
      query = query.eq("is_public", true);
    }
    if (options.unreadOnly) query = query.is("read_at", null);
    if (options.starredOnly) query = query.eq("is_starred", true);
  } else if (options.scope === "global") {
    query = query.eq("is_public", true).is("removed_at", null);
  }

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const [{ data, error }, blockedIds] = await Promise.all([
    query,
    fetchBlockedIds(supabase, options.viewerId ?? null),
  ]);
  if (error) throw error;

  let items = (data ?? []) as unknown as BookmarkWithAuthor[];
  if (options.scope === "global" || options.scope === "tag") {
    items = items.filter((b) => !b.removed_at);
  }
  if (blockedIds.size > 0) {
    items = items.filter((b) => !blockedIds.has(b.user_id));
  }

  const ids = items.map((b) => b.id);
  const urls = items.map((b) => b.url).filter((u): u is string => Boolean(u));
  const withViewer = Boolean(options.viewerId) && items.length > 0;

  const [tagMap, { data: likes }, { data: ownByRepost }, { data: ownByUrl }] =
    await Promise.all([
      fetchTagsForBookmarks(supabase, ids),
      withViewer
        ? supabase
            .from("likes")
            .select("bookmark_id")
            .eq("user_id", options.viewerId!)
            .in("bookmark_id", ids)
        : Promise.resolve({ data: [] as { bookmark_id: string }[] }),
      withViewer
        ? supabase
            .from("bookmarks")
            .select("id, reposted_from")
            .eq("user_id", options.viewerId!)
            .in("reposted_from", ids)
        : Promise.resolve({ data: [] as { id: string; reposted_from: string | null }[] }),
      withViewer && urls.length > 0
        ? supabase
            .from("bookmarks")
            .select("id, url")
            .eq("user_id", options.viewerId!)
            .in("url", urls)
        : Promise.resolve({ data: [] as { id: string; url: string }[] }),
    ]);
  items = items.map((b) => ({ ...b, tags: tagMap.get(b.id) ?? [] }));

  let likedIds: string[] = [];
  const repostedIds: Record<string, string> = {};
  if (withViewer) {
    likedIds = (likes ?? []).map((l) => l.bookmark_id);

    const repostMap = new Map<string, string>();
    for (const row of ownByRepost ?? []) {
      if (row.reposted_from) repostMap.set(row.reposted_from, row.id);
    }
    const urlMap = new Map<string, string>();
    for (const row of ownByUrl ?? []) {
      if (row.url) urlMap.set(row.url, row.id);
    }
    for (const b of items) {
      const own =
        repostMap.get(b.id) ?? (b.url ? urlMap.get(b.url) : undefined);
      if (own && own !== b.id) repostedIds[b.id] = own;
    }
  }

  return {
    items,
    likedIds,
    repostedIds,
    nextCursor:
      items.length === PAGE_SIZE ? items[items.length - 1].created_at : null,
  };
}
