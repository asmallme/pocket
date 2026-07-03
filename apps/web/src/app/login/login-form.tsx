"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function handleOAuth(provider: "github" | "google") {
    setOauthLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setOauthLoading(null);
      toast.error(
        error.message.includes("not enabled")
          ? "该登录方式暂未开通"
          : "登录失败：" + error.message
      );
    }
  }

  const oauthButtons = (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={oauthLoading !== null}
        onClick={() => handleOAuth("github")}
      >
        {oauthLoading === "github" ? "跳转中..." : "使用 GitHub 登录"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={oauthLoading !== null}
        onClick={() => handleOAuth("google")}
      >
        {oauthLoading === "google" ? "跳转中..." : "使用 Google 登录"}
      </Button>
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">或使用邮箱</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );

  async function handleLogin(formData: FormData) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });
    setLoading(false);
    if (error) {
      toast.error("登录失败：" + error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleSignup(formData: FormData) {
    const username = formData.get("username") as string;
    if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
      toast.error("用户名只能包含字母、数字和下划线，长度 2-20");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      options: { data: { username } },
    });
    setLoading(false);
    if (error) {
      toast.error("注册失败：" + error.message);
      return;
    }
    toast.success("注册成功！");
    router.push(next);
    router.refresh();
  }

  return (
    <Tabs defaultValue="login">
      <TabsList className="w-full">
        <TabsTrigger value="login" className="flex-1">
          登录
        </TabsTrigger>
        <TabsTrigger value="signup" className="flex-1">
          注册
        </TabsTrigger>
      </TabsList>

      <TabsContent value="login">
        <Card>
          <CardHeader>
            <CardTitle>欢迎回来</CardTitle>
            <CardDescription>登录后继续收藏与分享</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {oauthButtons}
            <form action={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">邮箱</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">密码</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "登录中..." : "登录"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="signup">
        <Card>
          <CardHeader>
            <CardTitle>创建账号</CardTitle>
            <CardDescription>开始收集你的第一条收藏</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {oauthButtons}
            <form action={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-username">用户名</Label>
                <Input
                  id="signup-username"
                  name="username"
                  required
                  placeholder="字母、数字或下划线"
                  pattern="[a-zA-Z0-9_]{2,20}"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">邮箱</Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">密码</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="至少 6 位"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "注册中..." : "注册"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
