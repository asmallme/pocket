import Link from "next/link";
import { Globe, Lock, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { LikeButton } from "@/components/like-button";
import { ReadToggle } from "@/components/read-toggle";
import { formatRelativeTime, hostnameOf } from "@/lib/format";
import type { BookmarkWithAuthor } from "@pocket/shared";

export function BookmarkCard({
  bookmark,
  likedByViewer,
  ownerControls = false,
}: {
  bookmark: BookmarkWithAuthor;
  likedByViewer?: boolean;
  /** 自己的收藏列表中展示稍后读切换 */
  ownerControls?: boolean;
}) {
  const host = hostnameOf(bookmark.url);
  const authorName = bookmark.author.display_name ?? bookmark.author.username;

  return (
    <Card className="gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/u/${bookmark.author.username}`}
          className="flex items-center gap-2 font-medium hover:underline"
        >
          <Avatar className="size-6">
            <AvatarImage src={bookmark.author.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {authorName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {authorName}
        </Link>
        <span className="text-muted-foreground">
          · {formatRelativeTime(bookmark.created_at)}
        </span>
        {!bookmark.is_public && (
          <Lock className="size-3.5 text-muted-foreground" />
        )}
      </div>

      {bookmark.note && (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {bookmark.note}
        </p>
      )}

      {bookmark.content_type === "link" && bookmark.url && (
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/60"
        >
          {bookmark.cover_image && (
            <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bookmark.cover_image}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium group-hover:underline">
              {bookmark.title ?? bookmark.url}
            </p>
            {bookmark.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {bookmark.description}
              </p>
            )}
            {host && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="size-3" />
                {host}
              </p>
            )}
          </div>
        </a>
      )}

      {bookmark.content_type === "image" && bookmark.cover_image && (
        <div className="overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bookmark.cover_image}
            alt={bookmark.title ?? ""}
            className="max-h-96 w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex items-center gap-1 text-muted-foreground">
        <LikeButton
          bookmarkId={bookmark.id}
          initialCount={bookmark.like_count}
          initialLiked={likedByViewer ?? false}
        />
        <Link
          href={`/b/${bookmark.id}`}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-foreground"
        >
          <MessageCircle className="size-4" />
          {bookmark.comment_count > 0 && bookmark.comment_count}
        </Link>
        {ownerControls && (
          <span className="ml-auto">
            <ReadToggle bookmarkId={bookmark.id} readAt={bookmark.read_at} />
          </span>
        )}
      </div>
    </Card>
  );
}
