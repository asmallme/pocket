import Link from "next/link";
import type { Tag } from "@pocket/shared";
import { Badge } from "@/components/ui/badge";

export function TagBadges({ tags }: { tags: Tag[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Link key={tag.id} href={`/tags/${tag.slug}`}>
          <Badge variant="secondary" className="h-6 px-2 text-[11px] font-normal hover:bg-secondary/80">
            #{tag.name}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
