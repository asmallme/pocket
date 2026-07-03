import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unfurl } from "@/lib/unfurl";
import { checkApiRateLimit, withRateLimitHeaders } from "@/lib/api-rate-limit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Accept either cookie session (web) or bearer token (extension).
  const bearer = request.headers.get("authorization")?.replace(/^Bearer /i, "");
  const {
    data: { user },
  } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "请先登录" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const { blocked, result } = checkApiRateLimit(request, "unfurl", user.id);
  if (blocked) {
    const headers = new Headers(CORS_HEADERS);
    blocked.headers.forEach((value, key) => headers.set(key, value));
    return new NextResponse(blocked.body, {
      status: blocked.status,
      headers,
    });
  }

  const body = await request.json().catch(() => null);
  const url = body?.url;
  if (typeof url !== "string") {
    return NextResponse.json(
      { error: "缺少 url 参数" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const result_unfurl = await unfurl(url);
    return withRateLimitHeaders(
      NextResponse.json(result_unfurl, { headers: CORS_HEADERS }),
      result
    );
  } catch {
    return NextResponse.json(
      { error: "链接解析失败" },
      { status: 422, headers: CORS_HEADERS }
    );
  }
}
