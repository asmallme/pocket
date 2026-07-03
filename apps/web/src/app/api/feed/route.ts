import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchFeed } from "@/lib/feed";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const scope = params.get("scope") === "following" ? "following" : "global";
  const cursor = params.get("cursor");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (scope === "following" && !user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const viewerId = user?.id ?? null;

  try {
    const page = await fetchFeed(supabase, { scope, cursor, viewerId });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "加载失败" }, { status: 500 });
  }
}
