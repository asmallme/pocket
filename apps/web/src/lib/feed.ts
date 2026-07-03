import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookmarkWithAuthor } from "@pocket/shared";
import { fetchTagsForBookmarks } from "./tag-service";

export const PAGE_SIZE = 20;

export interface FeedPage {
  items: BookmarkWithAuthor[];
  nextCursor: string | null;
  likedIds: string[];
}

const BOOKMARK_SELECT =
  "*, author:profiles!bookmarks_user_id_fkey(id, username, display_name, avatar_url)";

interface FeedOptions {
  scope: "global" | "following" | "user" | "tag" | "subscribed_tags";
  cursor?: string | null;
  userId?: string;
  viewerId?: string | null;
  includePrivate?: boolean;
  tagSlug?: string | null;
}

export async function fetchFeed(
  supabase: SupabaseClient,
  options: FeedOptions
): Promise<FeedPage> {
  const emptyPage: FeedPage = { items: [], nextCursor: null, likedIds: [] };

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
  } else if (options.scope === "global") {
    query = query.eq("is_public", true).is("removed_at", null);
  }

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  let items = (data ?? []) as unknown as BookmarkWithAuthor[];
  if (options.scope === "global" || options.scope === "tag") {
    items = items.filter((b) => !b.removed_at);
  }

  const tagMap = await fetchTagsForBookmarks(
    supabase,
    items.map((b) => b.id)
  );
  items = items.map((b) => ({ ...b, tags: tagMap.get(b.id) ?? [] }));

  let likedIds: string[] = [];
  if (options.viewerId && items.length > 0) {
    const { data: likes } = await supabase
      .from("likes")
      .select("bookmark_id")
      .eq("user_id", options.viewerId)
      .in(
        "bookmark_id",
        items.map((b) => b.id)
      );
    likedIds = (likes ?? []).map((l) => l.bookmark_id);
  }

  return {
    items,
    likedIds,
    nextCursor:
      items.length === PAGE_SIZE ? items[items.length - 1].created_at : null,
  };
}
