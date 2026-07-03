import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSummary, suggestTags } from "@/lib/deepseek";
import { attachTagsToBookmark } from "@/lib/tag-service";
import { checkApiRateLimit, withRateLimitHeaders } from "@/lib/api-rate-limit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function getUser(request: Request) {
  const supabase = await createClient();
  const bearer = request.headers.get("authorization")?.replace(/^Bearer /i, "");
  return bearer
    ? supabase.auth.getUser(bearer)
    : supabase.auth.getUser();
}

export async function POST(request: NextRequest) {
  const {
    data: { user },
  } = await getUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "请先登录" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const { blocked, result } = checkApiRateLimit(request, "ai/enrich", user.id);
  if (blocked) {
    const headers = new Headers(CORS_HEADERS);
    blocked.headers.forEach((value, key) => headers.set(key, value));
    return new NextResponse(blocked.body, {
      status: blocked.status,
      headers,
    });
  }

  const supabase = await createClient();

  const body = await request.json().catch(() => null);
  const bookmarkId = body?.bookmark_id as string | undefined;
  if (!bookmarkId) {
    return NextResponse.json({ error: "缺少 bookmark_id" }, { status: 400 });
  }

  const [{ data: bookmark }, { data: profile }, { data: existingTags }] =
    await Promise.all([
    supabase
      .from("bookmarks")
      .select("id, user_id, title, description, note, url, ai_summary")
      .eq("id", bookmarkId)
      .single(),
    supabase
      .from("profiles")
      .select("ai_summary_enabled, ai_auto_tag_enabled")
      .eq("id", user.id)
      .single(),
    supabase
      .from("bookmark_tags")
      .select("tag_id")
      .eq("bookmark_id", bookmarkId),
  ]);

  if (!bookmark || bookmark.user_id !== user.id) {
    return NextResponse.json(
      { error: "无权操作" },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  const input = {
    title: bookmark.title,
    description: bookmark.description,
    note: bookmark.note,
    url: bookmark.url,
  };

  let summary: string | null = bookmark.ai_summary ?? null;
  let tags: string[] = [];

  const hasTags = (existingTags ?? []).length > 0;

  if (profile?.ai_summary_enabled !== false && !bookmark.ai_summary) {
    summary = await generateSummary(input);
    if (summary) {
      await supabase
        .from("bookmarks")
        .update({ ai_summary: summary })
        .eq("id", bookmarkId);
    }
  }

  if (profile?.ai_auto_tag_enabled !== false && !hasTags) {
    tags = await suggestTags(input);
    if (tags.length > 0) {
      await attachTagsToBookmark(supabase, bookmarkId, tags);
    }
  }

  return withRateLimitHeaders(
    NextResponse.json({ summary, tags }, { headers: CORS_HEADERS }),
    result
  );
}
