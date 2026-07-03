import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFeed } from "@/lib/feed";
import { Feed } from "@/components/feed";
import { SubscribeTagButton } from "@/components/subscribe-tag-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tags")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return { title: "标签" };
  return { title: `#${data.name}` };
}

export default async function TagDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tag } = await supabase
    .from("tags")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!tag) notFound();

  let subscribed = false;
  if (user) {
    const { data: sub } = await supabase
      .from("tag_subscriptions")
      .select("tag_id")
      .eq("user_id", user.id)
      .eq("tag_id", tag.id)
      .maybeSingle();
    subscribed = !!sub;
  }

  const page = await fetchFeed(supabase, {
    scope: "tag",
    tagSlug: slug,
    viewerId: user?.id ?? null,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">#{tag.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            该标签下的公开收藏
          </p>
        </div>
        <SubscribeTagButton
          tagId={tag.id}
          initialSubscribed={subscribed}
          loggedIn={!!user}
        />
      </div>
      <Feed
        scope="tag"
        tagSlug={slug}
        initialPage={page}
        emptyMessage="这个标签下还没有公开收藏"
      />
    </div>
  );
}
