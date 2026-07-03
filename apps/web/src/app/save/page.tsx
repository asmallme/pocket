import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SaveForm } from "./save-form";

export const metadata = { title: "收藏" };

export default async function SavePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; title?: string; text?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/save");

  const params = await searchParams;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-xl font-semibold">收藏内容</h1>
      <SaveForm
        userId={user.id}
        initialUrl={params.url ?? ""}
        initialTitle={params.title ?? ""}
        initialNote={params.text ?? ""}
        fromShare={!!(params.url || params.text)}
      />
    </div>
  );
}
