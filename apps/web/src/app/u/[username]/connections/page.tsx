import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/follow-button";
import { cn } from "@/lib/utils";
import type { Profile } from "@pocket/shared";

export const metadata = { title: "关注与粉丝" };

type Tab = "followers" | "following";

export default async function ConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "following" ? "following" : "followers";

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

  // followers: 谁关注了 TA；following: TA 关注了谁
  const { data: rows } = await supabase
    .from("follows")
    .select(
      tab === "followers"
        ? "profile:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, bio)"
        : "profile:profiles!follows_following_id_fkey(id, username, display_name, avatar_url, bio)"
    )
    .eq(tab === "followers" ? "following_id" : "follower_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const people = (rows ?? [])
    .map((row) => (row as unknown as { profile: Profile }).profile)
    .filter(Boolean);

  // 当前登录用户已关注的人，用于展示按钮状态
  let viewerFollowing = new Set<string>();
  if (user && people.length > 0) {
    const { data: mine } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in(
        "following_id",
        people.map((p) => p.id)
      );
    viewerFollowing = new Set((mine ?? []).map((f) => f.following_id));
  }

  const name = profile.display_name ?? profile.username;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/u/${profile.username}`}
          className="rounded-full p-1.5 transition-colors hover:bg-accent"
          aria-label="返回主页"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-lg font-semibold">{name}</h1>
      </div>

      <div className="flex gap-1 border-b">
        {(
          [
            { key: "followers", label: "粉丝" },
            { key: "following", label: "关注" },
          ] as const
        ).map((t) => (
          <Link
            key={t.key}
            href={`/u/${profile.username}/connections?tab=${t.key}`}
            className={cn(
              "border-b-2 px-4 py-2 text-sm transition-colors",
              tab === t.key
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="space-y-1">
        {people.map((person) => {
          const personName = person.display_name ?? person.username;
          return (
            <div
              key={person.id}
              className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent/50"
            >
              <Link href={`/u/${person.username}`}>
                <Avatar className="size-10">
                  <AvatarImage src={person.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {personName.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/u/${person.username}`}
                  className="font-medium hover:underline"
                >
                  {personName}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  @{person.username}
                  {person.bio ? ` · ${person.bio}` : ""}
                </p>
              </div>
              {user && user.id !== person.id && (
                <FollowButton
                  targetUserId={person.id}
                  initialFollowing={viewerFollowing.has(person.id)}
                  loggedIn={true}
                />
              )}
            </div>
          );
        })}
        {people.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {tab === "followers" ? "还没有粉丝" : "还没有关注任何人"}
          </p>
        )}
      </div>
    </div>
  );
}
