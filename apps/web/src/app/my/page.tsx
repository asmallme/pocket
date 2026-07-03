import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BookmarkCard } from "@/components/bookmark-card";
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

export default async function MyBookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    v?: string;
    r?: string;
    cursor?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my");

  const { q, type, v, r, cursor } = await searchParams;

  let query = supabase
    .from("bookmarks")
    .select(
      "*, author:profiles!bookmarks_user_id_fkey(id, username, display_name, avatar_url)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (type && ["link", "text", "image", "video"].includes(type)) {
    query = query.eq("content_type", type);
  }
  if (v === "public") query = query.eq("is_public", true);
  if (v === "private") query = query.eq("is_public", false);
  if (r === "unread") query = query.is("read_at", null);
  if (r === "read") query = query.not("read_at", "is", null);
  if (q) {
    const escaped = q.replace(/[%_,]/g, "");
    query = query.or(
      `title.ilike.%${escaped}%,note.ilike.%${escaped}%,description.ilike.%${escaped}%`
    );
  }
  if (cursor) query = query.lt("created_at", cursor);

  const { data } = await query;
  const rows = (data ?? []) as unknown as BookmarkWithAuthor[];
  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? items[items.length - 1].created_at : null;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">我的收藏</h1>

      {/* 搜索 */}
      <form action="/my" method="GET" className="relative">
        {type && <input type="hidden" name="type" value={type} />}
        {v && <input type="hidden" name="v" value={v} />}
        {r && <input type="hidden" name="r" value={r} />}
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="搜索标题、推荐语、摘要..."
          className="pl-9"
        />
      </form>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex gap-1">
          {TYPE_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/my${buildQuery({ q, v, r, type: f.key || undefined })}`}
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
              href={`/my${buildQuery({ q, type, r, v: f.key || undefined })}`}
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
              href={`/my${buildQuery({ q, type, v, r: f.key || undefined })}`}
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
      </div>

      {/* 列表 */}
      <div className="space-y-4">
        {items.map((bookmark) => (
          <BookmarkCard key={bookmark.id} bookmark={bookmark} ownerControls />
        ))}
        {items.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {q || type || v || r
              ? "没有符合条件的收藏"
              : "还没有收藏，去收藏第一条内容吧"}
          </p>
        )}
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/my${buildQuery({ q, type, v, r, cursor: nextCursor })}`}
            >
              下一页
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
