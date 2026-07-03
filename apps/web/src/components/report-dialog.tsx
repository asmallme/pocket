"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function ReportDialog({
  bookmarkId,
  loggedIn,
}: {
  bookmarkId: string;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    const reason = (formData.get("reason") as string).trim();
    if (!reason) return;

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("reports").insert({
      bookmark_id: bookmarkId,
      reporter_id: user.id,
      reason,
    });
    setSubmitting(false);

    if (error) {
      toast.error(
        error.code === "23505" ? "你已经举报过这条内容了" : "提交失败，请重试"
      );
      return;
    }
    toast.success("已收到举报，我们会尽快处理");
    setOpen(false);
  }

  function handleTriggerClick(e: React.MouseEvent) {
    if (!loggedIn) {
      e.preventDefault();
      router.push("/login");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={handleTriggerClick}
        >
          <Flag className="size-4" />
          举报
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>举报这条内容</DialogTitle>
          <DialogDescription>
            请说明举报原因，我们会尽快核实处理。
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <Textarea
            name="reason"
            required
            rows={4}
            maxLength={500}
            placeholder="例如：垃圾广告、侵权内容、违法信息..."
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "提交中..." : "提交举报"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
