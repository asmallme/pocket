import Link from "next/link";
import { Bell, Bookmark, Plus, Tags } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import type { Profile } from "@pocket/shared";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let unreadCount = 0;
  if (user) {
    const [{ data }, { count }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("bookmarks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);
    profile = data;
    unreadCount = count ?? 0;
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Bookmark className="size-5 text-primary" />
          <span className="text-lg tracking-tight">Pocket</span>
        </Link>

        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="ghost" className="rounded-full">
            <Link href="/tags">
              <Tags className="size-4" />
            </Link>
          </Button>
          {profile ? (
            <>
              {unreadCount > 0 && (
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="relative rounded-full"
                >
                  <Link href="/my?r=unread" title="稍后读">
                    <Bell className="size-4" />
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" className="gap-1.5 rounded-full">
                <Link href="/save">
                  <Plus className="size-4" />
                  收藏
                </Link>
              </Button>
              <UserMenu profile={profile} />
            </>
          ) : (
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/login">登录</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
