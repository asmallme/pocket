"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@pocket/shared";

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    const username = formData.get("username") as string;
    if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
      toast.error("用户名只能包含字母、数字和下划线，长度 2-20");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        display_name: (formData.get("display_name") as string) || null,
        bio: (formData.get("bio") as string) || null,
      })
      .eq("id", profile.id);
    setLoading(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "该用户名已被占用" : "保存失败：" + error.message
      );
      return;
    }
    toast.success("资料已更新");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="username">用户名</Label>
        <Input
          id="username"
          name="username"
          defaultValue={profile.username}
          required
          pattern="[a-zA-Z0-9_]{2,20}"
        />
        <p className="text-xs text-muted-foreground">
          你的主页地址：/u/用户名
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="display_name">昵称</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name ?? ""}
          maxLength={30}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">简介</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ""}
          maxLength={200}
          rows={3}
          placeholder="介绍一下自己..."
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "保存中..." : "保存"}
      </Button>
    </form>
  );
}
