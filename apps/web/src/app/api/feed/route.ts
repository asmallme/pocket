import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchFeed } from "@/lib/feed";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const rawScope = params.get("scope");
  const scope =
    rawScope === "following"
      ? "following"
      : rawScope === "tag"
        ? "tag"
        : rawScope === "subscribed_tags"
          ? "subscribed_tags"
          : "global";
  const cursor = params.get("cursor");
  const tagSlug = params.get("tag");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if ((scope === "following" || scope === "subscribed_tags") && !user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const viewerId = user?.id ?? null;

  try {
    const page = await fetchFeed(supabase, {
      scope,
      cursor,
      viewerId,
      tagSlug,
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "加载失败" }, { status: 500 });
  }
}
