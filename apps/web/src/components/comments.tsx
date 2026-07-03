"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime } from "@/lib/format";
import type { Comment } from "@pocket/shared";

export function Comments({
  bookmarkId,
  initialComments,
  viewerId,
}: {
  bookmarkId: string;
  initialComments: Comment[];
  viewerId: string | null;
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (!viewerId) {
      router.push("/login");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({ bookmark_id: bookmarkId, user_id: viewerId, content: trimmed })
      .select(
        "*, author:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)"
      )
      .single();
    setSubmitting(false);

    if (error || !data) {
      toast.error("评论失败，请重试");
      return;
    }
    setComments((prev) => [...prev, data as unknown as Comment]);
    setContent("");
  }

  async function handleDelete(commentId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    if (error) {
      toast.error("删除失败");
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">
        评论 {comments.length > 0 && `(${comments.length})`}
      </h2>

      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={viewerId ? "说点什么..." : "登录后参与评论"}
          rows={2}
          maxLength={2000}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
          >
            {submitting ? "发送中..." : "发送"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => {
          const name = comment.author.display_name ?? comment.author.username;
          return (
            <div key={comment.id} className="flex gap-3">
              <Link href={`/u/${comment.author.username}`}>
                <Avatar className="size-8">
                  <AvatarImage src={comment.author.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/u/${comment.author.username}`}
                    className="font-medium hover:underline"
                  >
                    {name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                  {viewerId === comment.user_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="删除评论"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">
                  {comment.content}
                </p>
              </div>
            </div>
          );
        })}
        {comments.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            还没有评论，来抢沙发
          </p>
        )}
      </div>
    </section>
  );
}
