"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/tag-input";
import { replaceBookmarkTags } from "@/lib/tag-service";
import type { Bookmark, Tag } from "@pocket/shared";

function fieldText(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function EditBookmarkDialog({
  bookmark,
}: {
  bookmark: Bookmark & { tags?: Tag[] };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(bookmark.is_public);
  const [isStarred, setIsStarred] = useState(bookmark.is_starred);
  const [tags, setTags] = useState<string[]>(
    (bookmark.tags ?? []).map((t) => t.name)
  );
  const [saving, setSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setIsPublic(bookmark.is_public);
      setIsStarred(bookmark.is_starred);
      setTags((bookmark.tags ?? []).map((t) => t.name));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData(e.currentTarget);
      const updates: {
        note: string | null;
        is_public: boolean;
        is_starred: boolean;
        title?: string | null;
      } = {
        note: fieldText(formData, "note"),
        is_public: isPublic,
        is_starred: isStarred,
      };
      if (bookmark.content_type !== "text") {
        updates.title = fieldText(formData, "title");
      }

      const supabase = createClient();
      const { error } = await supabase
        .from("bookmarks")
        .update(updates)
        .eq("id", bookmark.id);

      if (error) {
        toast.error("保存失败：" + error.message);
        return;
      }

      await replaceBookmarkTags(supabase, bookmark.id, tags);

      toast.success("已更新");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "保存失败，请重试"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Pencil className="size-4" />
          编辑
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑收藏</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {bookmark.content_type !== "text" && (
            <div className="space-y-2">
              <Label htmlFor="edit-title">标题</Label>
              <Input
                id="edit-title"
                name="title"
                key={`title-${bookmark.id}-${bookmark.title}`}
                defaultValue={bookmark.title ?? ""}
                maxLength={300}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-note">
              {bookmark.content_type === "text" ? "内容" : "推荐语"}
            </Label>
            <Textarea
              id="edit-note"
              name="note"
              key={`note-${bookmark.id}-${bookmark.note}`}
              defaultValue={bookmark.note ?? ""}
              rows={bookmark.content_type === "text" ? 6 : 3}
              maxLength={5000}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">星标收藏</p>
              <p className="text-xs text-muted-foreground">
                标记你认为高价值的内容
              </p>
            </div>
            <Switch checked={isStarred} onCheckedChange={setIsStarred} />
          </div>
          <div className="space-y-2">
            <Label>标签</Label>
            <TagInput value={tags} onChange={setTags} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">
                {isPublic ? "公开" : "私密"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPublic ? "所有人都能在 feed 中看到" : "仅自己可见"}
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
