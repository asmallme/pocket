"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Feed } from "@/components/feed";
import { cn } from "@/lib/utils";
import type { FeedPage } from "@/lib/feed";
import type { Tag } from "@pocket/shared";

type Tab = "global" | "following" | "tags";

export function HomeFeed({
  tagSlug,
  popularTags,
  globalPage,
  followingPage,
  tagsPage,
  viewerId,
}: {
  tagSlug?: string;
  popularTags: (Tag & { count: number })[];
  globalPage: FeedPage;
  followingPage: FeedPage;
  tagsPage: FeedPage;
  viewerId?: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "global";

  function tabHref(next: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "global") params.delete("tab");
    else params.set("tab", next);
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  return (
    <div className="space-y-3">
      {popularTags.length > 0 && (
        <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <Link
            href={pathname}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              !tagSlug
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            全部
          </Link>
          {popularTags.map((t) => (
            <Link
              key={t.id}
              href={`/?tag=${t.slug}${tab !== "global" ? `&tab=${tab}` : ""}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                tagSlug === t.slug
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              #{t.name}
            </Link>
          ))}
          <Link
            href="/tags"
            className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
          >
            更多
          </Link>
        </div>
      )}

      <div className="flex gap-1 rounded-[var(--radius)] bg-muted p-1">
        {(
          [
            { id: "global" as const, label: "发现" },
            { id: "following" as const, label: "关注" },
            { id: "tags" as const, label: "标签订阅" },
          ] as const
        ).map((t) => (
          <Link
            key={t.id}
            href={tabHref(t.id)}
            className={cn(
              "flex-1 rounded-[calc(var(--radius)-2px)] py-2 text-center text-xs font-medium transition-colors md:text-sm",
              tab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "global" && (
        <Feed
          scope={tagSlug ? "tag" : "global"}
          initialPage={globalPage}
          tagSlug={tagSlug}
          viewerId={viewerId}
        />
      )}
      {tab === "following" && (
        <Feed
          scope="following"
          initialPage={followingPage}
          emptyMessage="关注一些人，这里会出现他们的收藏"
          viewerId={viewerId}
        />
      )}
      {tab === "tags" && (
        <Feed
          scope="subscribed_tags"
          initialPage={tagsPage}
          emptyMessage="去标签页订阅感兴趣的主题"
          viewerId={viewerId}
        />
      )}
    </div>
  );
}
