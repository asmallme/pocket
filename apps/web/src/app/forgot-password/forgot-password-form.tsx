"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
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

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      formData.get("email") as string,
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setLoading(false);
    if (error) {
      toast.error("发送失败：" + error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <MailCheck className="size-10 text-green-600" />
          <p className="font-medium">重置邮件已发送</p>
          <p className="text-sm text-muted-foreground">
            请检查邮箱（包括垃圾邮件文件夹），点击邮件中的链接设置新密码。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>找回密码</CardTitle>
        <CardDescription>
          输入注册邮箱，我们会发送一封重置密码的邮件
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "发送中..." : "发送重置邮件"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            想起密码了？
            <Link href="/login" className="ml-1 text-primary underline">
              返回登录
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
