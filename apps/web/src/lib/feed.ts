import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookmarkWithAuthor } from "@pocket/shared";

export const PAGE_SIZE = 20;

export interface FeedPage {
  items: BookmarkWithAuthor[];
  nextCursor: string | null;
  /** IDs among `items` that the current viewer has liked. */
  likedIds: string[];
}

const BOOKMARK_SELECT =
  "*, author:profiles!bookmarks_user_id_fkey(id, username, display_name, avatar_url)";

interface FeedOptions {
  scope: "global" | "following" | "user";
  cursor?: string | null;
  userId?: string;
  viewerId?: string | null;
  includePrivate?: boolean;
}

/**
 * Cursor is the created_at of the last item on the previous page.
 * Ties on created_at are unlikely (timestamptz precision); keep it simple for MVP.
 */
export async function fetchFeed(
  supabase: SupabaseClient,
  options: FeedOptions
): Promise<FeedPage> {
  let query = supabase
    .from("bookmarks")
    .select(BOOKMARK_SELECT)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const emptyPage: FeedPage = { items: [], nextCursor: null, likedIds: [] };

  if (options.scope === "following") {
    if (!options.viewerId) return emptyPage;
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", options.viewerId);
    const followingIds = (follows ?? []).map((f) => f.following_id);
    if (followingIds.length === 0) return emptyPage;
    query = query.in("user_id", followingIds).eq("is_public", true);
  } else if (options.scope === "user") {
    query = query.eq("user_id", options.userId!);
    if (!options.includePrivate) {
      query = query.eq("is_public", true);
    }
  } else {
    query = query.eq("is_public", true);
  }

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const items = (data ?? []) as unknown as BookmarkWithAuthor[];

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
