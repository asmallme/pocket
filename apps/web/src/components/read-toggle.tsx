"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Circle, CircleCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** 稍后读状态切换：未读 ↔ 已读（仅自己的收藏展示）。 */
export function ReadToggle({
  bookmarkId,
  readAt,
}: {
  bookmarkId: string;
  readAt: string | null;
}) {
  const router = useRouter();
  const [isRead, setIsRead] = useState(!!readAt);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    const next = !isRead;
    setIsRead(next);

    const supabase = createClient();
    const { error } = await supabase
      .from("bookmarks")
      .update({ read_at: next ? new Date().toISOString() : null })
      .eq("id", bookmarkId);

    if (error) {
      setIsRead(!next);
      toast.error("操作失败，请重试");
    } else {
      router.refresh();
    }
    setPending(false);
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-accent",
        isRead ? "text-green-600" : "text-muted-foreground hover:text-foreground"
      )}
      title={isRead ? "标为未读，重新放回稍后读" : "标记为已读"}
    >
      {isRead ? (
        <CircleCheck className="size-4" />
      ) : (
        <Circle className="size-4" />
      )}
      {isRead ? "已读" : "标记已读"}
    </button>
  );
}
