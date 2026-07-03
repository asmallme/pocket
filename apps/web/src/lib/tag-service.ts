import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tag } from "@pocket/shared";
import { normalizeTagName, toTagSlug } from "./tags";

/** 按名称 upsert tag 并关联到收藏。 */
export async function attachTagsToBookmark(
  supabase: SupabaseClient,
  bookmarkId: string,
  names: string[]
): Promise<Tag[]> {
  const unique = [
    ...new Set(names.map(normalizeTagName).filter((n) => n.length > 0)),
  ];
  if (unique.length === 0) return [];

  const tags: Tag[] = [];
  for (const name of unique.slice(0, 5)) {
    const slug = toTagSlug(name);
    const { data: existing } = await supabase
      .from("tags")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    let tag = existing as Tag | null;
    if (!tag) {
      const { data: created, error } = await supabase
        .from("tags")
        .insert({ name, slug })
        .select()
        .single();
      if (error) {
        const { data: retry } = await supabase
          .from("tags")
          .select("*")
          .eq("slug", slug)
          .single();
        tag = retry as Tag;
      } else {
        tag = created as Tag;
      }
    }
    if (!tag) continue;
    tags.push(tag);
    await supabase
      .from("bookmark_tags")
      .upsert({ bookmark_id: bookmarkId, tag_id: tag.id });
  }
  return tags;
}

/** 替换收藏的全部标签。 */
export async function replaceBookmarkTags(
  supabase: SupabaseClient,
  bookmarkId: string,
  names: string[]
) {
  await supabase.from("bookmark_tags").delete().eq("bookmark_id", bookmarkId);
  return attachTagsToBookmark(supabase, bookmarkId, names);
}

/** 批量查询收藏的标签。 */
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

/** 获取用户主页常出现的 tag（公开收藏）。 */
export async function fetchUserTopTags(
  supabase: SupabaseClient,
  userId: string,
  limit = 8
): Promise<(Tag & { count: number })[]> {
  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("is_public", true)
    .is("removed_at", null);
  const ids = (bookmarks ?? []).map((b) => b.id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("bookmark_tags")
    .select("tag:tags(id, name, slug)")
    .in("bookmark_id", ids);

  const counts = new Map<string, Tag & { count: number }>();
  for (const row of data ?? []) {
    const tag = (row as unknown as { tag: Tag | Tag[] }).tag;
    const tags = Array.isArray(tag) ? tag : tag ? [tag] : [];
    for (const t of tags) {
      if (!t) continue;
      const prev = counts.get(t.id);
      if (prev) prev.count += 1;
      else counts.set(t.id, { ...t, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** 热门公开标签。 */
export async function fetchPopularTags(
  supabase: SupabaseClient,
  limit = 30
): Promise<(Tag & { count: number })[]> {
  const { data: publicBookmarks } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("is_public", true)
    .is("removed_at", null);
  const ids = (publicBookmarks ?? []).map((b) => b.id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("bookmark_tags")
    .select("tag:tags(id, name, slug)")
    .in("bookmark_id", ids);

  const counts = new Map<string, Tag & { count: number }>();
  for (const row of data ?? []) {
    const tag = (row as unknown as { tag: Tag | Tag[] }).tag;
    const tags = Array.isArray(tag) ? tag : tag ? [tag] : [];
    for (const t of tags) {
      if (!t) continue;
      const prev = counts.get(t.id);
      if (prev) prev.count += 1;
      else counts.set(t.id, { ...t, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** 同标签的相关公开收藏。 */
export async function fetchRelatedBookmarks(
  supabase: SupabaseClient,
  bookmarkId: string,
  limit = 5
) {
  const { data: links } = await supabase
    .from("bookmark_tags")
    .select("tag_id")
    .eq("bookmark_id", bookmarkId);
  const tagIds = (links ?? []).map((l) => l.tag_id);
  if (tagIds.length === 0) return [];

  const { data: relatedLinks } = await supabase
    .from("bookmark_tags")
    .select("bookmark_id")
    .in("tag_id", tagIds)
    .neq("bookmark_id", bookmarkId);

  const ids = [
    ...new Set((relatedLinks ?? []).map((l) => l.bookmark_id)),
  ].slice(0, limit * 3);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("bookmarks")
    .select(
      "*, author:profiles!bookmarks_user_id_fkey(id, username, display_name, avatar_url)"
    )
    .in("id", ids)
    .eq("is_public", true)
    .is("removed_at", null)
    .order("like_count", { ascending: false })
    .limit(limit);

  const items = (data ?? []) as unknown as import("@pocket/shared").BookmarkWithAuthor[];
  const tagMap = await fetchTagsForBookmarks(
    supabase,
    items.map((b) => b.id)
  );
  return items.map((b) => ({ ...b, tags: tagMap.get(b.id) ?? [] }));
}
