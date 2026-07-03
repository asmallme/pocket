"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { replaceBookmarkTags } from "@/lib/tag-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookmarkWithAuthor } from "@pocket/shared";

export function MyBookmarksBatch({
  bookmarks,
}: {
  bookmarks: BookmarkWithAuthor[];
}) {
  const router = useRouter();
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [bulkTag, setBulkTag] = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyUpdate(
    updates: Record<string, unknown>,
    tagAction?: "add"
  ) {
    if (selected.size === 0) return;
    setPending(true);
    const supabase = createClient();
    const ids = [...selected];
    try {
      const { error } = await supabase
        .from("bookmarks")
        .update(updates)
        .in("id", ids);
      if (error) throw error;

      if (tagAction === "add" && bulkTag.trim()) {
        for (const id of ids) {
          const bookmark = bookmarks.find((b) => b.id === id);
          const existing = (bookmark?.tags ?? []).map((t) => t.name);
          const merged = [...new Set([...existing, bulkTag.trim()])].slice(
            0,
            5
          );
          await replaceBookmarkTags(supabase, id, merged);
        }
      }

      toast.success(`已更新 ${ids.length} 条收藏`);
      setSelected(new Set());
      setBulkTag("");
      router.refresh();
    } catch {
      toast.error("批量操作失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={batchMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setBatchMode((v) => !v);
            setSelected(new Set());
          }}
        >
          {batchMode ? "退出批量" : "批量管理"}
        </Button>
        {batchMode && selected.size > 0 && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                void applyUpdate({ read_at: new Date().toISOString() })
              }
            >
              标为已读
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => void applyUpdate({ read_at: null })}
            >
              标为未读
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => void applyUpdate({ is_public: true })}
            >
              公开
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => void applyUpdate({ is_public: false })}
            >
              私密
            </Button>
            <div className="flex items-center gap-1">
              <Input
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
                placeholder="添加标签"
                className="h-8 w-28"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={pending || !bulkTag.trim()}
                onClick={() => void applyUpdate({}, "add")}
              >
                加标签
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">
              已选 {selected.size} 条
            </span>
          </>
        )}
      </div>

      {batchMode && (
        <div className="space-y-2">
          {bookmarks.map((b) => (
            <label
              key={b.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(b.id)}
                onChange={() => toggle(b.id)}
              />
              <span className="line-clamp-1">
                {b.title ?? b.note ?? b.url ?? "无标题"}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
