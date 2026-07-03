import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MobileShareTokenInfo } from "@/components/mobile-share-token-card";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "个人中心" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const focusIosShortcut = section === "ios-shortcut";
  const nextPath = focusIosShortcut
    ? "/settings?section=ios-shortcut"
    : "/settings";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const [{ data: profile }, { data: mobileShareToken }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("mobile_share_tokens")
      .select("id, name, created_at, last_used_at")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .maybeSingle(),
  ]);
  if (!profile) redirect("/login");
  const activeMobileShareToken =
    mobileShareToken as unknown as MobileShareTokenInfo | null;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-xl font-semibold">个人中心</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        管理资料、阅读偏好，以及 iOS 快捷指令收藏配置。
      </p>
      <SettingsForm
        profile={profile}
        email={user.email ?? ""}
        createdAt={user.created_at}
        mobileShareToken={activeMobileShareToken}
        focusIosShortcut={focusIosShortcut}
      />
    </div>
  );
}
