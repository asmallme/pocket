"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { BookmarkCard } from "@/components/bookmark-card";
import type { FeedPage } from "@/lib/feed";
import type { BookmarkWithAuthor } from "@pocket/shared";

export function Feed({
  scope,
  initialPage,
  emptyMessage = "还没有内容",
}: {
  scope: "global" | "following";
  initialPage: FeedPage;
  emptyMessage?: string;
}) {
  const [items, setItems] = useState<BookmarkWithAuthor[]>(initialPage.items);
  const [likedIds, setLikedIds] = useState<Set<string>>(
    new Set(initialPage.likedIds)
  );
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/feed?scope=${scope}&cursor=${encodeURIComponent(cursor)}`
      );
      if (!res.ok) return;
      const page: FeedPage = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((b) => b.id));
        return [...prev, ...page.items.filter((b) => !seen.has(b.id))];
      });
      setLikedIds((prev) => new Set([...prev, ...page.likedIds]));
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, scope]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          likedByViewer={likedIds.has(bookmark.id)}
        />
      ))}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {loading && (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        )}
        {!cursor && items.length > 0 && (
          <p className="text-xs text-muted-foreground">到底啦</p>
        )}
      </div>
    </div>
  );
}
