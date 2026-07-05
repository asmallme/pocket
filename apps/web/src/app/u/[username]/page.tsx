import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFeed } from "@/lib/feed";
import { fetchUserTopTags } from "@/lib/tag-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookmarkCard } from "@/components/bookmark-card";
import { FollowButton } from "@/components/follow-button";
import type { Profile } from "@pocket/shared";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!data) return { title: "用户" };

  const name = data.display_name ?? data.username;
  const description = data.bio ?? `${name} 在 Pocket 上的收藏`;
  return {
    title: `${name} (@${data.username})`,
    description,
    openGraph: {
      title: `${name} (@${data.username})`,
      description,
      type: "profile",
      images: data.avatar_url ? [{ url: data.avatar_url }] : undefined,
    },
  };
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single<Profile>();
  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSelf = user?.id === profile.id;

  let viewerQuiet = false;
  if (user) {
    const { data: viewerProfile } = await supabase
      .from("profiles")
      .select("quiet_mode")
      .eq("id", user.id)
      .single();
    viewerQuiet = viewerProfile?.quiet_mode ?? false;
  }

  const [
    page,
    topTags,
    { count: followerCount },
    { count: followingCount },
    followRes,
  ] = await Promise.all([
    fetchFeed(supabase, {
      scope: "user",
      userId: profile.id,
      viewerId: user?.id ?? null,
      includePrivate: isSelf,
    }),
    fetchUserTopTags(supabase, profile.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    user && !isSelf
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const name = profile.display_name ?? profile.username;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Avatar className="size-16">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-xl">
            {name.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">{name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-1.5 text-sm">{profile.bio}</p>}
          {topTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topTags.map((tag) => (
                <Link key={tag.id} href={`/tags/${tag.slug}`}>
                  <Badge variant="secondary" className="text-xs">
                    #{tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
          {!viewerQuiet && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              <Link
                href={`/u/${profile.username}/connections?tab=followers`}
                className="hover:underline"
              >
                <span className="font-medium text-foreground">
                  {followerCount ?? 0}
                </span>{" "}
                粉丝
              </Link>
              {" · "}
              <Link
                href={`/u/${profile.username}/connections?tab=following`}
                className="hover:underline"
              >
                <span className="font-medium text-foreground">
                  {followingCount ?? 0}
                </span>{" "}
                关注
              </Link>
            </p>
          )}
        </div>
        {!isSelf && (
          <FollowButton
            targetUserId={profile.id}
            initialFollowing={!!followRes.data}
            loggedIn={!!user}
          />
        )}
      </div>

      <div className="space-y-4">
        {page.items.map((bookmark) => (
          <BookmarkCard
            key={bookmark.id}
            bookmark={bookmark}
            likedByViewer={page.likedIds.includes(bookmark.id)}
            viewerId={user?.id ?? null}
            repostedByViewerId={page.repostedIds[bookmark.id] ?? null}
          />
        ))}
        {page.items.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {isSelf ? "你还没有收藏，去收藏第一条内容吧" : "TA 还没有公开的收藏"}
          </p>
        )}
      </div>
    </div>
  );
}
