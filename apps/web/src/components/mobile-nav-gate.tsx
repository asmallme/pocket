import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/mobile-nav";

export async function MobileNavGate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return <MobileNav />;
}
