import { supabase } from "./supabase";

const WEB_URL = (import.meta.env.WXT_WEB_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

export interface UnfurlMeta {
  title: string | null;
  description: string | null;
  image: string | null;
}

/** 借用网站 /api/unfurl 解析链接元数据（带用户 token）。 */
export async function unfurlViaWeb(url: string): Promise<UnfurlMeta | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  try {
    const res = await fetch(`${WEB_URL}/api/unfurl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    return (await res.json()) as UnfurlMeta;
  } catch {
    return null;
  }
}
