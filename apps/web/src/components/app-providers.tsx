import { createClient } from "@/lib/supabase/server";
import { QuietModeProvider } from "@/components/quiet-mode";

export async function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let quiet = false;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("quiet_mode")
      .eq("id", user.id)
      .single();
    quiet = data?.quiet_mode ?? false;
  }

  return <QuietModeProvider quiet={quiet}>{children}</QuietModeProvider>;
}
