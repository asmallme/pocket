import Link from "next/link";
import { Bell, Bookmark, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MainNav } from "@/components/main-nav";
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
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 w-full max-w-3xl items-center gap-3 px-4 md:h-14 md:max-w-4xl">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
        >
          <Bookmark className="size-[18px] text-primary md:size-5" />
          <span className="text-base md:text-lg">网兜</span>
        </Link>

        {profile && <MainNav />}

        <div className="ml-auto flex items-center gap-0.5 md:gap-1">
          {profile ? (
            <>
              {unreadCount > 0 && (
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className="relative size-9 rounded-full"
                >
                  <Link href="/my?r=unread" title="稍后读">
                    <Bell className="size-4" />
                    <span className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </Link>
                </Button>
              )}
              <Button
                asChild
                size="sm"
                className="hidden gap-1.5 rounded-full md:inline-flex"
              >
                <Link href="/save">
                  <Plus className="size-4" />
                  收藏
                </Link>
              </Button>
              <UserMenu profile={profile} />
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="rounded-full">
                <Link href="/about">介绍</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link href="/login">登录</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
