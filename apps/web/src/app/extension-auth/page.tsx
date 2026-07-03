import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExtensionAuthClient } from "./extension-auth-client";

export const metadata = { title: "授权插件登录" };

export default async function ExtensionAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ ext?: string }>;
}) {
  const { ext } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/extension-auth?ext=${ext ?? ""}`)}`);
  }

  return (
    <div className="mx-auto mt-12 max-w-sm">
      <Suspense>
        <ExtensionAuthClient extensionId={ext ?? null} email={user.email ?? ""} />
      </Suspense>
    </div>
  );
}
