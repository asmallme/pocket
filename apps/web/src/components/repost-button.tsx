"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { RepostResult } from "@pocket/shared";

export function RepostButton({
  bookmarkId,
  initialCount,
  initialRepostedId,
  hasAiSummary,
}: {
  bookmarkId: string;
  initialCount: number;
  initialRepostedId?: string | null;
  hasAiSummary: boolean;
}) {
  const router = useRouter();
  const [repostedId, setRepostedId] = useState(initialRepostedId ?? null);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function repost() {
    if (pending) return;
    if (repostedId) {
      router.push(`/b/${repostedId}`);
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setPending(true);
    const { data, error } = await supabase.rpc("repost_bookmark", {
      p_bookmark_id: bookmarkId,
    });
    setPending(false);

    if (error || !data) {
      toast.error("转存失败，请重试");
      return;
    }

    const result = data as RepostResult;
    setRepostedId(result.id);
    if (result.duplicate) {
      toast.info("你已收藏过这条内容", {
        action: { label: "查看", onClick: () => router.push(`/b/${result.id}`) },
      });
      return;
    }

    setCount((c) => c + 1);
    if (!hasAiSummary) {
      void fetch("/api/ai/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmark_id: result.id }),
      }); // 后台补 AI 摘要，不阻塞
    }
    toast.success("已转存到我的收藏（默认私密）", {
      action: { label: "查看", onClick: () => router.push(`/b/${result.id}`) },
    });
  }

  return (
    <button
      onClick={repost}
      title={repostedId ? "已转存，点击查看" : "转存到我的收藏"}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-accent",
        repostedId ? "text-primary" : "hover:text-foreground"
      )}
    >
      {repostedId ? (
        <BookmarkCheck className="size-4" />
      ) : (
        <BookmarkPlus className="size-4" />
      )}
      {count > 0 && count}
    </button>
  );
}
