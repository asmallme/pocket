"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // 邮件链接会带 code 参数，browser client 会自动交换成会话；
    // 这里等待会话就绪后再展示表单
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady("ok");
        return;
      }
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) setReady("ok");
        if (event === "SIGNED_OUT") setReady("invalid");
      });
      // 数秒内仍无会话则视为链接失效
      const timer = setTimeout(() => {
        setReady((prev) => (prev === "checking" ? "invalid" : prev));
      }, 4000);
      return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
      };
    });
  }, []);

  async function handleSubmit(formData: FormData) {
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;
    if (password !== confirm) {
      toast.error("两次输入的密码不一致");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error("设置失败：" + error.message);
      return;
    }
    toast.success("密码已更新，已为你登录");
    router.push("/");
    router.refresh();
  }

  if (ready === "checking") {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        正在验证链接...
      </p>
    );
  }

  if (ready === "invalid") {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-center">
          <p className="font-medium">链接无效或已过期</p>
          <p className="text-sm text-muted-foreground">
            重置链接有效期较短，请重新发起找回密码。
          </p>
          <Button asChild variant="outline">
            <Link href="/forgot-password">重新发送</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>设置新密码</CardTitle>
        <CardDescription>为你的账号设置一个新密码</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">新密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="至少 6 位"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">确认新密码</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "保存中..." : "确认修改"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
