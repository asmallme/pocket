import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchFeed } from "@/lib/feed";
import { Feed } from "@/components/feed";
import { ClipboardDetector } from "@/components/clipboard-detector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const globalPage = await fetchFeed(supabase, {
    scope: "global",
    viewerId: user?.id ?? null,
  });

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
        <Feed scope="global" initialPage={globalPage} />
      </div>
    );
  }

  const followingPage = await fetchFeed(supabase, {
    scope: "following",
    viewerId: user.id,
  });

  return (
    <>
      <ClipboardDetector />
      <Tabs defaultValue="global">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="global" className="flex-1">
            发现
          </TabsTrigger>
          <TabsTrigger value="following" className="flex-1">
            关注
          </TabsTrigger>
        </TabsList>
        <TabsContent value="global">
          <Feed scope="global" initialPage={globalPage} />
        </TabsContent>
        <TabsContent value="following">
          <Feed
            scope="following"
            initialPage={followingPage}
            emptyMessage="关注一些人，这里会出现他们的收藏"
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
