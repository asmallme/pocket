import type { BookmarkSource, ContentType, UnfurlResult } from "@pocket/shared";
import { supabase, WEB_URL } from "@/lib/supabase";

export interface SaveInput {
  url?: string | null;
  title?: string | null;
  description?: string | null;
  cover_image?: string | null;
  content_type: ContentType;
  note?: string | null;
  is_public?: boolean;
  source: BookmarkSource;
  tags?: string[];
  /** 页面正文节选：仅随 enrich 请求传给 AI，不写入 bookmarks。 */
  content?: string | null;
}

export type SaveResult =
  | { status: "saved"; id: string }
  | { status: "duplicate"; id: string }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

/** 调 web 端 unfurl 接口补全链接元数据（含正文节选）。 */
export async function unfurlViaWeb(url: string): Promise<UnfurlResult | null> {
  try {
    const res = await fetch(`${WEB_URL}/api/unfurl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, content: true }),
    });
    if (!res.ok) return null;
    return (await res.json()) as UnfurlResult;
  } catch {
    return null;
  }
}

/** 入库后异步触发 AI 摘要与打标（与插件同一接口），失败静默。 */
export function enrichBookmark(bookmarkId: string, content?: string | null) {
  fetch(`${WEB_URL}/api/ai/enrich`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      content ? { bookmarkId, content } : { bookmarkId }
    ),
  }).catch(() => {});
}

export async function findExistingBookmark(
  url: string
): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("url", url)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

function toTagSlug(name: string): string {
  const trimmed = name.trim().slice(0, 30);
  if (!trimmed) return "tag";
  const slug = trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9一-龥_-]/g, "");
  return slug || "tag";
}

async function attachTagsToBookmark(bookmarkId: string, names: string[]) {
  const unique = [
    ...new Set(names.map((n) => n.trim().slice(0, 30)).filter(Boolean)),
  ];
  for (const name of unique.slice(0, 5)) {
    const slug = toTagSlug(name);
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    let tagId = existing?.id;
    if (!tagId) {
      const { data: created, error } = await supabase
        .from("tags")
        .insert({ name, slug })
        .select("id")
        .single();
      if (error) {
        // 并发创建冲突时回查
        const { data: retry } = await supabase
          .from("tags")
          .select("id")
          .eq("slug", slug)
          .single();
        tagId = retry?.id;
      } else {
        tagId = created.id;
      }
    }
    if (!tagId) continue;
    await supabase
      .from("bookmark_tags")
      .upsert(
        { bookmark_id: bookmarkId, tag_id: tagId },
        { onConflict: "bookmark_id,tag_id" }
      );
  }
}

/** 保存收藏：链接类型先查重，成功后异步 AI enrich。 */
export async function saveBookmark(input: SaveInput): Promise<SaveResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { status: "unauthenticated" };

  if (input.content_type === "link" && input.url) {
    const existing = await findExistingBookmark(input.url).catch(() => null);
    if (existing) return { status: "duplicate", id: existing };
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: session.user.id,
      url: input.url ?? null,
      title: input.title ?? null,
      description: input.description ?? null,
      cover_image: input.cover_image ?? null,
      content_type: input.content_type,
      note: input.note ?? null,
      is_public: input.is_public ?? true,
      source: input.source,
    })
    .select("id")
    .single();
  if (error) return { status: "error", message: error.message };

  if (input.tags?.length) {
    await attachTagsToBookmark(data.id, input.tags).catch(() => {});
  }
  enrichBookmark(data.id, input.content);
  return { status: "saved", id: data.id };
}
