import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchFeed } from "@/lib/feed";
import { fetchPopularTags } from "@/lib/tag-service";
import { Feed } from "@/components/feed";
import { ClipboardDetector } from "@/components/clipboard-detector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const popularTags = await fetchPopularTags(supabase, 12);

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-muted/30 p-6 text-center">
          <h1 className="text-lg font-semibold">收藏你在全网看到的好内容</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            一键收藏、随时回顾，也能发现别人正在读什么。
            <Link href="/login" className="ml-1 text-primary underline">
              立即加入
            </Link>
          </p>
        </div>
        {popularTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {popularTags.map((t) => (
              <Link key={t.id} href={`/?tag=${t.slug}`}>
                <Badge variant="outline">#{t.name}</Badge>
              </Link>
            ))}
          </div>
        )}
        <Feed scope={tagSlug ? "tag" : "global"} initialPage={globalPage} tagSlug={tagSlug} />
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
      {popularTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href="/">
            <Badge variant={!tagSlug ? "default" : "outline"}>全部</Badge>
          </Link>
          {popularTags.map((t) => (
            <Link key={t.id} href={`/?tag=${t.slug}`}>
              <Badge variant={tagSlug === t.slug ? "default" : "outline"}>
                #{t.name}
              </Badge>
            </Link>
          ))}
          <Link href="/tags">
            <Badge variant="secondary">更多标签</Badge>
          </Link>
        </div>
      )}
      <Tabs defaultValue={tagSlug ? "global" : "global"}>
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="global" className="flex-1">
            发现
          </TabsTrigger>
          <TabsTrigger value="following" className="flex-1">
            关注
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex-1">
            标签订阅
          </TabsTrigger>
        </TabsList>
        <TabsContent value="global">
          <Feed
            scope={tagSlug ? "tag" : "global"}
            initialPage={globalPage}
            tagSlug={tagSlug}
          />
        </TabsContent>
        <TabsContent value="following">
          <Feed
            scope="following"
            initialPage={followingPage}
            emptyMessage="关注一些人，这里会出现他们的收藏"
          />
        </TabsContent>
        <TabsContent value="tags">
          <Feed
            scope="subscribed_tags"
            initialPage={tagsPage}
            emptyMessage="去标签页订阅感兴趣的主题"
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
