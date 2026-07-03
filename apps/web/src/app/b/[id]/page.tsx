import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookmarkCard } from "@/components/bookmark-card";
import { Comments } from "@/components/comments";
import { DeleteBookmarkButton } from "@/components/delete-bookmark-button";
import type { BookmarkWithAuthor, Comment } from "@pocket/shared";

export default async function BookmarkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookmark } = await supabase
    .from("bookmarks")
    .select(
      "*, author:profiles!bookmarks_user_id_fkey(id, username, display_name, avatar_url)"
    )
    .eq("id", id)
    .single();

  if (!bookmark) notFound();
  const typed = bookmark as unknown as BookmarkWithAuthor;

  const [{ data: comments }, likedRes] = await Promise.all([
    supabase
      .from("comments")
      .select(
        "*, author:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)"
      )
      .eq("bookmark_id", id)
      .order("created_at", { ascending: true }),
    user
      ? supabase
          .from("likes")
          .select("bookmark_id")
          .eq("bookmark_id", id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="space-y-6">
      <BookmarkCard bookmark={typed} likedByViewer={!!likedRes.data} />
      {user?.id === typed.user_id && (
        <div className="flex justify-end">
          <DeleteBookmarkButton bookmarkId={id} />
        </div>
      )}
      <Comments
        bookmarkId={id}
        initialComments={(comments ?? []) as unknown as Comment[]}
        viewerId={user?.id ?? null}
      />
    </div>
  );
}
