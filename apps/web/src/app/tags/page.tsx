import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchPopularTags } from "@/lib/tag-service";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "标签发现" };

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const supabase = await createClient();
  const tags = await fetchPopularTags(supabase, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">标签发现</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          订阅感兴趣的主题，在首页「标签订阅」里看到相关收藏
        </p>
      </div>

      {tags.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          还没有标签，收藏时添加标签后会出现在这里
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link key={tag.id} href={`/tags/${tag.slug}`}>
              <Badge variant="outline" className="px-3 py-1.5 text-sm">
                #{tag.name}
                <span className="ml-1.5 text-muted-foreground">
                  {tag.count}
                </span>
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
