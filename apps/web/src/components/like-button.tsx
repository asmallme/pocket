"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LikeButton({
  bookmarkId,
  initialCount,
  initialLiked,
}: {
  bookmarkId: string;
  initialCount: number;
  initialLiked: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setPending(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    const { error } = nextLiked
      ? await supabase
          .from("likes")
          .insert({ bookmark_id: bookmarkId, user_id: user.id })
      : await supabase
          .from("likes")
          .delete()
          .eq("bookmark_id", bookmarkId)
          .eq("user_id", user.id);

    if (error) {
      setLiked(!nextLiked);
      setCount((c) => c + (nextLiked ? -1 : 1));
      toast.error("操作失败，请重试");
    }
    setPending(false);
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-accent",
        liked ? "text-red-500" : "hover:text-foreground"
      )}
    >
      <Heart className={cn("size-4", liked && "fill-current")} />
      {count > 0 && count}
    </button>
  );
}
