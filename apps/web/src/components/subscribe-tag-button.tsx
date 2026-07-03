"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SubscribeTagButton({
  tagId,
  initialSubscribed,
  loggedIn,
}: {
  tagId: string;
  initialSubscribed: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    if (pending) return;
    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const next = !subscribed;
    setSubscribed(next);
    const { error } = next
      ? await supabase
          .from("tag_subscriptions")
          .insert({ user_id: user.id, tag_id: tagId })
      : await supabase
          .from("tag_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("tag_id", tagId);

    if (error) {
      setSubscribed(!next);
      toast.error("操作失败");
    } else {
      router.refresh();
    }
    setPending(false);
  }

  return (
    <Button
      size="sm"
      variant={subscribed ? "outline" : "default"}
      className="rounded-full"
      onClick={toggle}
      disabled={pending}
    >
      {subscribed ? "已订阅" : "订阅标签"}
    </Button>
  );
}
