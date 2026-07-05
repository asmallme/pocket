import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSummary, suggestTags } from "@/lib/deepseek";
import { checkApiRateLimit, withRateLimitHeaders } from "@/lib/api-rate-limit";

/** 收藏前预览：建议标签与摘要（不写库）。 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { blocked, result } = checkApiRateLimit(request, "ai/suggest", user.id);
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);
  const input = {
    title: (body?.title as string) ?? null,
    description: (body?.description as string) ?? null,
    note: (body?.note as string) ?? null,
    url: (body?.url as string) ?? null,
    content:
      typeof body?.content === "string" && body.content.trim()
        ? body.content.trim().slice(0, 4000)
        : null,
  };

  const [summary, tags] = await Promise.all([
    generateSummary(input),
    suggestTags(input),
  ]);

  return withRateLimitHeaders(
    NextResponse.json({ summary, tags }),
    result
  );
}
