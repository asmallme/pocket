import { supabase } from "./supabase";

const WEB_URL = (import.meta.env.WXT_WEB_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

/** 收藏入库后在后台触发 AI 摘要与自动打标（不在打开 popup 时调用）。 */
export async function enrichBookmark(bookmarkId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  try {
    await fetch(`${WEB_URL}/api/ai/enrich`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ bookmark_id: bookmarkId }),
    });
  } catch {
    // 静默失败，不影响收藏主流程
  }
}
