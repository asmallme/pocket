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
import type { Bookmark } from "@pocket/shared";

export function EditBookmarkDialog({ bookmark }: { bookmark: Bookmark }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(bookmark.is_public);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("bookmarks")
      .update({
        title: (formData.get("title") as string).trim() || null,
        note: (formData.get("note") as string).trim() || null,
        is_public: isPublic,
      })
      .eq("id", bookmark.id);
    setSaving(false);
    if (error) {
      toast.error("保存失败，请重试");
      return;
    }
    toast.success("已更新");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        <form action={handleSubmit} className="space-y-4">
          {bookmark.content_type !== "text" && (
            <div className="space-y-2">
              <Label htmlFor="edit-title">标题</Label>
              <Input
                id="edit-title"
                name="title"
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
              defaultValue={bookmark.note ?? ""}
              rows={bookmark.content_type === "text" ? 6 : 3}
              maxLength={5000}
            />
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
