import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchFeed } from "@/lib/feed";
import { fetchPopularTags } from "@/lib/tag-service";
import { Feed } from "@/components/feed";
import { HomeFeed } from "@/components/home-feed";
import { ClipboardDetector } from "@/components/clipboard-detector";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag: tagSlug } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const globalPage = await fetchFeed(supabase, {
    scope: tagSlug ? "tag" : "global",
    tagSlug: tagSlug ?? null,
    viewerId: user?.id ?? null,
  });

  const popularTags = await fetchPopularTags(supabase, 16);

  if (!user) {
    return (
      <div className="space-y-4">
        <section className="rounded-[var(--radius)] border border-border/80 bg-card px-5 py-6 md:py-7">
          <h1 className="font-quote text-xl font-semibold leading-snug md:text-2xl">
            收藏你在全网看到的好内容
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            一键收藏、金句策展、标签订阅——在安静的信息流里，快速判断什么值得读。
            <Link href="/about" className="ml-1 font-medium text-primary underline-offset-2 hover:underline">
              了解 Pocket
            </Link>
            <span className="mx-1 text-border">·</span>
            <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
              立即加入
            </Link>
          </p>
        </section>
        {popularTags.length > 0 && (
          <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {popularTags.map((t) => (
              <Link key={t.id} href={`/?tag=${t.slug}`}>
                <Badge variant="secondary" className="shrink-0 font-normal">
                  #{t.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
        <Feed
          key={tagSlug ?? "__all__"}
          scope={tagSlug ? "tag" : "global"}
          initialPage={globalPage}
          tagSlug={tagSlug}
          viewerId={null}
        />
      </div>
    );
  }

  const [followingPage, tagsPage] = await Promise.all([
    fetchFeed(supabase, { scope: "following", viewerId: user.id }),
    fetchFeed(supabase, { scope: "subscribed_tags", viewerId: user.id }),
  ]);

  return (
    <>
      <ClipboardDetector />
      <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">加载中...</div>}>
        <HomeFeed
          tagSlug={tagSlug}
          popularTags={popularTags}
          globalPage={globalPage}
          followingPage={followingPage}
          tagsPage={tagsPage}
          viewerId={user.id}
        />
      </Suspense>
    </>
  );
}
