import { supabase } from "./supabase";

export interface SaveInput {
  url?: string | null;
  title?: string | null;
  description?: string | null;
  cover_image?: string | null;
  content_type: "link" | "text" | "image" | "video";
  note?: string | null;
  is_public?: boolean;
  source: "extension" | "contextmenu" | "shortcut";
  tags?: string[];
}

export type SaveResult =
  | { status: "saved"; id: string }
  | { status: "duplicate"; id: string }
  | { status: "queued" }
  | { status: "unauthenticated" };

const QUEUE_KEY = "pocket:pending-saves";

/** 查询当前用户是否已收藏过该 URL。 */
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

async function insertBookmark(
  userId: string,
  input: SaveInput
): Promise<string> {
  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: userId,
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
  if (error) throw error;
  return data.id;
}

/**
 * 保存收藏：先查重（仅链接类型），失败时进入本地重试队列，
 * 避免断网或 token 过期时丢内容。
 */
export async function saveBookmark(input: SaveInput): Promise<SaveResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { status: "unauthenticated" };

  if (input.content_type === "link" && input.url) {
    const existing = await findExistingBookmark(input.url).catch(() => null);
    if (existing) return { status: "duplicate", id: existing };
  }

  try {
    const id = await insertBookmark(session.user.id, input);
    if (input.tags?.length) {
      const { attachTagsToBookmark } = await import("./tags");
      await attachTagsToBookmark(id, input.tags);
    }
    const { enrichBookmark } = await import("./enrich");
    void enrichBookmark(id);
    return { status: "saved", id };
  } catch {
    await enqueue(input);
    return { status: "queued" };
  }
}

async function enqueue(input: SaveInput) {
  const stored = await browser.storage.local.get(QUEUE_KEY);
  const queue: SaveInput[] = (stored[QUEUE_KEY] as SaveInput[]) ?? [];
  queue.push(input);
  await browser.storage.local.set({ [QUEUE_KEY]: queue.slice(-50) });
}

/** 重试队列中的失败收藏，成功的移出队列。 */
export async function flushSaveQueue(): Promise<number> {
  const stored = await browser.storage.local.get(QUEUE_KEY);
  const queue: SaveInput[] = (stored[QUEUE_KEY] as SaveInput[]) ?? [];
  if (queue.length === 0) return 0;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return 0;

  const remaining: SaveInput[] = [];
  let flushed = 0;
  for (const item of queue) {
    try {
      await insertBookmark(session.user.id, item);
      flushed++;
    } catch {
      remaining.push(item);
    }
  }
  await browser.storage.local.set({ [QUEUE_KEY]: remaining });
  return flushed;
}
