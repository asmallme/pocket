import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookmarkCard } from "@/components/bookmark-card";
import { Comments } from "@/components/comments";
import { DeleteBookmarkButton } from "@/components/delete-bookmark-button";
import { EditBookmarkDialog } from "@/components/edit-bookmark-dialog";
import { ReportDialog } from "@/components/report-dialog";
import type { BookmarkWithAuthor, Comment } from "@pocket/shared";

const BOOKMARK_SELECT =
  "*, author:profiles!bookmarks_user_id_fkey(id, username, display_name, avatar_url)";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookmarks")
    .select("title, note, description, cover_image, is_public")
    .eq("id", id)
    .maybeSingle();

  if (!data || !data.is_public) return { title: "收藏" };

  const title = data.title ?? data.note?.slice(0, 60) ?? "一条收藏";
  const description =
    data.note?.slice(0, 160) ?? data.description?.slice(0, 160) ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: data.cover_image ? [{ url: data.cover_image }] : undefined,
    },
    twitter: {
      card: data.cover_image ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

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
    .select(BOOKMARK_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (!bookmark) notFound();
  const typed = bookmark as unknown as BookmarkWithAuthor;
  const isOwner = user?.id === typed.user_id;

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
      {typed.removed_at && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          这条收藏因违规已被下架，仅你自己可见。
        </div>
      )}

      <BookmarkCard
        bookmark={typed}
        likedByViewer={!!likedRes.data}
        ownerControls={isOwner}
      />

      <div className="flex justify-end gap-1">
        {isOwner ? (
          <>
            <EditBookmarkDialog bookmark={typed} />
            <DeleteBookmarkButton bookmarkId={id} />
          </>
        ) : (
          <ReportDialog bookmarkId={id} loggedIn={!!user} />
        )}
      </div>

      <Comments
        bookmarkId={id}
        initialComments={(comments ?? []) as unknown as Comment[]}
        viewerId={user?.id ?? null}
      />
    </div>
  );
}
