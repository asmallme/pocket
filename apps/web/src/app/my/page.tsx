import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Shuffle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BOOKMARK_SELECT } from "@/lib/feed";
import { fetchTagsForBookmarks } from "@/lib/tag-service";
import { BookmarkCard } from "@/components/bookmark-card";
import { EditBookmarkDialog } from "@/components/edit-bookmark-dialog";
import { MyBookmarksBatch } from "@/components/my-bookmarks-batch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BookmarkWithAuthor } from "@pocket/shared";

export const metadata = { title: "我的收藏" };

const PAGE_SIZE = 20;

const TYPE_FILTERS = [
  { key: "", label: "全部类型" },
  { key: "link", label: "链接" },
  { key: "text", label: "文字" },
  { key: "image", label: "图片" },
] as const;

const VISIBILITY_FILTERS = [
  { key: "", label: "全部" },
  { key: "public", label: "公开" },
  { key: "private", label: "私密" },
] as const;

const READ_FILTERS = [
  { key: "", label: "全部" },
  { key: "unread", label: "稍后读" },
  { key: "read", label: "已读" },
] as const;

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

async function pickRandomBookmark(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  mode: "unread" | "revisit"
) {
  let countQuery = supabase
    .from("bookmarks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (mode === "unread") {
    countQuery = countQuery.is("read_at", null);
  } else {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    countQuery = countQuery
      .not("read_at", "is", null)
      .lt("created_at", cutoff.toISOString());
  }

  const { count } = await countQuery;
  if (!count) return null;

  const offset = Math.floor(Math.random() * count);
  let dataQuery = supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId);

  if (mode === "unread") {
    dataQuery = dataQuery.is("read_at", null);
  } else {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    dataQuery = dataQuery
      .not("read_at", "is", null)
      .lt("created_at", cutoff.toISOString());
  }

  const { data } = await dataQuery.range(offset, offset).maybeSingle();
  return data?.id ?? null;
}

export default async function MyBookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    v?: string;
    r?: string;
    tag?: string;
    star?: string;
    cursor?: string;
    serendipity?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my");

  const params = await searchParams;
  const { q, type, v, r, tag, star, cursor, serendipity } = params;

  if (serendipity === "unread" || serendipity === "revisit") {
    const id = await pickRandomBookmark(supabase, user.id, serendipity);
    if (id) redirect(`/b/${id}`);
  }

  let tagBookmarkIds: string[] | null = null;
  if (tag) {
    const { data: tagRow } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", tag)
      .maybeSingle();
    if (tagRow) {
      const { data: links } = await supabase
        .from("bookmark_tags")
        .select("bookmark_id")
        .eq("tag_id", tagRow.id);
      tagBookmarkIds = (links ?? []).map((l) => l.bookmark_id);
      if (tagBookmarkIds.length === 0) tagBookmarkIds = ["__none__"];
    }
  }

  let query = supabase
    .from("bookmarks")
    .select(BOOKMARK_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (tagBookmarkIds) query = query.in("id", tagBookmarkIds);
  if (type && ["link", "text", "image", "video"].includes(type)) {
    query = query.eq("content_type", type);
  }
  if (v === "public") query = query.eq("is_public", true);
  if (v === "private") query = query.eq("is_public", false);
  if (r === "unread") query = query.is("read_at", null);
  if (r === "read") query = query.not("read_at", "is", null);
  if (star === "1") query = query.eq("is_starred", true);
  if (q) {
    const escaped = q.replace(/[%_,]/g, "");
    query = query.or(
      `title.ilike.%${escaped}%,note.ilike.%${escaped}%,description.ilike.%${escaped}%`
    );
  }
  if (cursor) query = query.lt("created_at", cursor);

  const [{ data }, { data: userTags }] = await Promise.all([
    query,
    supabase
      .from("bookmark_tags")
      .select("tag:tags(id, name, slug)")
      .in(
        "bookmark_id",
        (
          await supabase
            .from("bookmarks")
            .select("id")
            .eq("user_id", user.id)
        ).data?.map((b) => b.id) ?? []
      ),
  ]);

  const rows = (data ?? []) as unknown as BookmarkWithAuthor[];
  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? items[items.length - 1].created_at : null;

  const tagMap = await fetchTagsForBookmarks(
    supabase,
    items.map((b) => b.id)
  );
  const itemsWithTags = items.map((b) => ({
    ...b,
    tags: tagMap.get(b.id) ?? [],
  }));

  const tagCounts = new Map<string, { slug: string; name: string; count: number }>();
  for (const row of userTags ?? []) {
    const t = (row as unknown as { tag: { id: string; name: string; slug: string } })
      .tag;
    if (!t) continue;
    const prev = tagCounts.get(t.slug);
    if (prev) prev.count += 1;
    else tagCounts.set(t.slug, { slug: t.slug, name: t.name, count: 1 });
  }
  const myTags = [...tagCounts.values()].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">我的收藏</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/my?serendipity=unread">
              <Shuffle className="mr-1.5 size-4" />
              随机未读
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/my?serendipity=revisit">
              <Sparkles className="mr-1.5 size-4" />
              温故知新
            </Link>
          </Button>
        </div>
      </div>

      <form action="/my" method="GET" className="relative">
        {type && <input type="hidden" name="type" value={type} />}
        {v && <input type="hidden" name="v" value={v} />}
        {r && <input type="hidden" name="r" value={r} />}
        {tag && <input type="hidden" name="tag" value={tag} />}
        {star && <input type="hidden" name="star" value={star} />}
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="搜索标题、推荐语、摘要..."
          className="pl-9"
        />
      </form>

      {myTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/my${buildQuery({ q, type, v, r, star })}`}
            className={cn(
              "rounded-full px-3 py-1 text-sm transition-colors",
              !tag
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            全部标签
          </Link>
          {myTags.map((t) => (
            <Link
              key={t.slug}
              href={`/my${buildQuery({ q, type, v, r, star, tag: t.slug })}`}
              className={cn(
                "rounded-full px-3 py-1 text-sm transition-colors",
                tag === t.slug
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              #{t.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex gap-1">
          {TYPE_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/my${buildQuery({ q, v, r, tag, star, type: f.key || undefined })}`}
              className={cn(
                "rounded-full px-3 py-1 transition-colors",
                (type ?? "") === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <span className="text-muted-foreground">·</span>
        <div className="flex gap-1">
          {VISIBILITY_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/my${buildQuery({ q, type, r, tag, star, v: f.key || undefined })}`}
              className={cn(
                "rounded-full px-3 py-1 transition-colors",
                (v ?? "") === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <span className="text-muted-foreground">·</span>
        <div className="flex gap-1">
          {READ_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/my${buildQuery({ q, type, v, tag, star, r: f.key || undefined })}`}
              className={cn(
                "rounded-full px-3 py-1 transition-colors",
                (r ?? "") === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <span className="text-muted-foreground">·</span>
        <Link
          href={`/my${buildQuery({ q, type, v, r, tag, star: star === "1" ? undefined : "1" })}`}
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            star === "1"
              ? "bg-amber-500 text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          星标
        </Link>
      </div>

      <MyBookmarksBatch bookmarks={itemsWithTags} />

      <div className="space-y-4">
        {itemsWithTags.map((bookmark) => (
          <div key={bookmark.id} className="space-y-1">
            <BookmarkCard bookmark={bookmark} ownerControls />
            <div className="flex justify-end px-1">
              <EditBookmarkDialog bookmark={bookmark} />
            </div>
          </div>
        ))}
        {itemsWithTags.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {q || type || v || r || tag || star
              ? "没有符合条件的收藏"
              : "还没有收藏，去收藏第一条内容吧"}
          </p>
        )}
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/my${buildQuery({ q, type, v, r, tag, star, cursor: nextCursor })}`}
            >
              下一页
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
