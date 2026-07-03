"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function FollowButton({
  targetUserId,
  initialFollowing,
  loggedIn,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
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
    if (!user) {
      router.push("/login");
      return;
    }

    const next = !following;
    setFollowing(next);
    const { error } = next
      ? await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: targetUserId })
      : await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);

    if (error) {
      setFollowing(!next);
      toast.error("操作失败，请重试");
    } else {
      router.refresh();
    }
    setPending(false);
  }

  return (
    <Button
      size="sm"
      variant={following ? "outline" : "default"}
      className="rounded-full"
      onClick={toggle}
      disabled={pending}
    >
      {following ? "已关注" : "关注"}
    </Button>
  );
}
