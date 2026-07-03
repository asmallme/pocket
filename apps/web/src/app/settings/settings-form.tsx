"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@pocket/shared";

export function SettingsForm({
  profile,
  email,
  createdAt,
}: {
  profile: Profile;
  email: string;
  createdAt: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [quietMode, setQuietMode] = useState(profile.quiet_mode);
  const [aiSummary, setAiSummary] = useState(profile.ai_summary_enabled);
  const [aiAutoTag, setAiAutoTag] = useState(profile.ai_auto_tag_enabled);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = profile.display_name ?? profile.username;

  async function handleAvatarChange(file: File | null) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("头像图片不能超过 5MB");
      return;
    }
    setUploadingAvatar(true);
    const supabase = createClient();
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const url = supabase.storage.from("media").getPublicUrl(path)
        .data.publicUrl;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", profile.id);
      if (updateError) throw updateError;

      toast.success("头像已更新");
      router.refresh();
    } catch {
      toast.error("头像上传失败，请重试");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleProfileSubmit(formData: FormData) {
    const username = formData.get("username") as string;
    if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
      toast.error("用户名只能包含字母、数字和下划线，长度 2-20");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        display_name: (formData.get("display_name") as string) || null,
        bio: (formData.get("bio") as string) || null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "该用户名已被占用" : "保存失败：" + error.message
      );
      return;
    }
    toast.success("资料已更新");
    router.refresh();
  }

  async function handlePasswordSubmit(formData: FormData) {
    const password = formData.get("new_password") as string;
    const confirm = formData.get("confirm_password") as string;
    if (password.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    if (password !== confirm) {
      toast.error("两次输入的密码不一致");
      return;
    }
    setChangingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setChangingPassword(false);
    if (error) {
      toast.error("修改失败：" + error.message);
      return;
    }
    toast.success("密码已修改");
  }

  async function savePreference(
    key: "quiet_mode" | "ai_summary_enabled" | "ai_auto_tag_enabled",
    value: boolean
  ) {
    setSavingPrefs(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ [key]: value })
      .eq("id", profile.id);
    setSavingPrefs(false);
    if (error) {
      toast.error("保存失败");
      return;
    }
    toast.success("偏好已更新");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* 头像 */}
      <Card>
        <CardContent className="flex items-center gap-4">
          <button
            className="group relative rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label="更换头像"
          >
            <Avatar className="size-16">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">
                {displayName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {uploadingAvatar ? (
                <Loader2 className="size-5 animate-spin text-white" />
              ) : (
                <Camera className="size-5 text-white" />
              )}
            </span>
          </button>
          <div>
            <p className="font-medium">{displayName}</p>
            <p className="text-sm text-muted-foreground">
              点击头像更换，支持 5MB 以内的图片
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
          />
        </CardContent>
      </Card>

      {/* 基本资料 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本资料</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleProfileSubmit} className="space-y-4">
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
              <Label htmlFor="bio">个人签名</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={profile.bio ?? ""}
                maxLength={200}
                rows={3}
                placeholder="介绍一下自己..."
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">阅读偏好</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">安静阅读模式</p>
              <p className="text-xs text-muted-foreground">
                隐藏点赞数、评论入口和粉丝数
              </p>
            </div>
            <Switch
              checked={quietMode}
              disabled={savingPrefs}
              onCheckedChange={(v) => {
                setQuietMode(v);
                void savePreference("quiet_mode", v);
              }}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">AI 三行摘要</p>
              <p className="text-xs text-muted-foreground">
                收藏入库时由 DeepSeek 生成价值摘要
              </p>
            </div>
            <Switch
              checked={aiSummary}
              disabled={savingPrefs}
              onCheckedChange={(v) => {
                setAiSummary(v);
                void savePreference("ai_summary_enabled", v);
              }}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">AI 自动打标</p>
              <p className="text-xs text-muted-foreground">
                收藏入库时自动建议标签
              </p>
            </div>
            <Switch
              checked={aiAutoTag}
              disabled={savingPrefs}
              onCheckedChange={(v) => {
                setAiAutoTag(v);
                void savePreference("ai_auto_tag_enabled", v);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 修改密码 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">修改密码</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">新密码</Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                required
                minLength={6}
                placeholder="至少 6 位"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">确认新密码</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" variant="outline" disabled={changingPassword}>
              {changingPassword ? "修改中..." : "修改密码"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 账号信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">账号信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">登录邮箱</span>
            <span>{email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">注册时间</span>
            <span>
              {new Date(createdAt).toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
