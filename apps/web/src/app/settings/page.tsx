import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "个人中心" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold">个人中心</h1>
      <SettingsForm
        profile={profile}
        email={user.email ?? ""}
        createdAt={user.created_at}
      />
      <div className="mt-8 flex items-center justify-center gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <Link href="/about" className="hover:text-foreground hover:underline">
          产品介绍
        </Link>
        <Link href="/terms" className="hover:text-foreground hover:underline">
          用户协议
        </Link>
        <Link href="/privacy" className="hover:text-foreground hover:underline">
          隐私政策
        </Link>
      </div>
    </div>
  );
}
