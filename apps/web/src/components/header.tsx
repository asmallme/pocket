import Link from "next/link";
import { Bookmark, Plus } from "lucide-react";
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
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Bookmark className="size-5 text-primary" />
          <span className="text-lg tracking-tight">Pocket</span>
        </Link>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
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
