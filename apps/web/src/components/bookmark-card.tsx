import Link from "next/link";
import { Globe, Lock, MessageCircle, Sparkles, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LikeButton } from "@/components/like-button";
import { ReadToggle } from "@/components/read-toggle";
import { TagBadges } from "@/components/tag-badges";
import {
  displayLinkTitle,
  formatRelativeTime,
  hostnameOf,
  isRedundantNote,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BookmarkWithAuthor } from "@pocket/shared";

export function BookmarkCard({
  bookmark,
  likedByViewer,
  ownerControls = false,
  quietMode = false,
}: {
  bookmark: BookmarkWithAuthor;
  likedByViewer?: boolean;
  ownerControls?: boolean;
  quietMode?: boolean;
}) {
  const host = hostnameOf(bookmark.url);
  const authorName = bookmark.author.display_name ?? bookmark.author.username;
  const showNote = !isRedundantNote(bookmark.note, bookmark.url);
  const linkTitle = displayLinkTitle(bookmark.title, bookmark.url);

  return (
    <article
      className={cn(
        "group rounded-[var(--radius)] border border-border/80 bg-card p-3 transition-colors",
        "hover:border-border hover:bg-card/80 md:p-3.5"
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/u/${bookmark.author.username}`}
          className="flex min-w-0 items-center gap-1.5 font-medium text-foreground hover:underline"
        >
          <Avatar className="size-5">
            <AvatarImage src={bookmark.author.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px]">
              {authorName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{authorName}</span>
        </Link>
        <span className="shrink-0">· {formatRelativeTime(bookmark.created_at)}</span>
        {bookmark.is_starred && (
          <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />
        )}
        {!bookmark.is_public && (
          <Lock className="size-3 shrink-0" />
        )}
        <Link
          href={`/b/${bookmark.id}`}
          className="ml-auto shrink-0 text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
        >
          详情
        </Link>
      </div>

      {showNote && (
        <blockquote className="font-quote mb-2.5 break-words rounded-r-[calc(var(--radius)-2px)] border-l-[3px] border-quote bg-quote-bg py-1.5 pl-3 pr-2 text-[15px] font-medium leading-snug text-foreground">
          {bookmark.note}
        </blockquote>
      )}

      {bookmark.ai_summary && (
        <p className="mb-2.5 flex gap-1.5 text-xs leading-relaxed text-ai">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 opacity-70" />
          <span className="line-clamp-2 whitespace-pre-line">
            {bookmark.ai_summary}
          </span>
        </p>
      )}

      {bookmark.content_type === "link" && bookmark.url && (
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 flex gap-2.5 rounded-[calc(var(--radius)-2px)] border border-border/60 bg-muted/40 p-2.5 transition-colors hover:bg-muted/70"
        >
          {bookmark.cover_image && (
            <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted md:size-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bookmark.cover_image}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="line-clamp-2 break-words text-sm font-medium leading-snug group-hover:underline">
              {linkTitle}
            </p>
            {bookmark.description &&
              !bookmark.ai_summary &&
              bookmark.description !== bookmark.url &&
              bookmark.description !== bookmark.title && (
              <p className="mt-0.5 line-clamp-1 break-words text-xs text-muted-foreground">
                {bookmark.description}
              </p>
            )}
            {host && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Globe className="size-3" />
                {host}
              </p>
            )}
          </div>
        </a>
      )}

      {bookmark.content_type === "image" && bookmark.cover_image && (
        <div className="mb-2 overflow-hidden rounded-[calc(var(--radius)-2px)] border border-border/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bookmark.cover_image}
            alt={bookmark.title ?? ""}
            className="max-h-72 w-full object-cover md:max-h-80"
            loading="lazy"
          />
        </div>
      )}

      {bookmark.tags && bookmark.tags.length > 0 && (
        <div className="mb-2">
          <TagBadges tags={bookmark.tags} />
        </div>
      )}

      {!quietMode && (
        <div className="flex items-center gap-0.5 border-t border-border/50 pt-2 text-muted-foreground">
          <LikeButton
            bookmarkId={bookmark.id}
            initialCount={bookmark.like_count}
            initialLiked={likedByViewer ?? false}
          />
          <Link
            href={`/b/${bookmark.id}`}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors hover:bg-accent hover:text-foreground"
          >
            <MessageCircle className="size-3.5" />
            {bookmark.comment_count > 0 && bookmark.comment_count}
          </Link>
          {ownerControls && (
            <span className="ml-auto">
              <ReadToggle bookmarkId={bookmark.id} readAt={bookmark.read_at} />
            </span>
          )}
        </div>
      )}

      {quietMode && ownerControls && (
        <div className="flex justify-end border-t border-border/50 pt-2">
          <ReadToggle bookmarkId={bookmark.id} readAt={bookmark.read_at} />
        </div>
      )}
    </article>
  );
}
