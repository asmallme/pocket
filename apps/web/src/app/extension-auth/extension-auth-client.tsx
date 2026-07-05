"use client";

import { useState } from "react";
import { CheckCircle2, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: unknown,
          callback: (response?: { ok?: boolean; error?: string }) => void
        ) => void;
        lastError?: { message?: string };
      };
    };
  }
}

export function ExtensionAuthClient({
  extensionId,
  email,
}: {
  extensionId: string | null;
  email: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleAuthorize() {
    if (!extensionId) return;
    setState("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/extension-token", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "凭证生成失败");

      const runtime = window.chrome?.runtime;
      if (!runtime?.sendMessage) {
        throw new Error("当前浏览器不支持插件授权，请在 Chrome/Edge 中打开");
      }

      runtime.sendMessage(
        extensionId,
        { type: "pocket-auth", token_hash: json.token_hash },
        (response) => {
          if (response?.ok) {
            setState("done");
          } else {
            setState("error");
            setMessage(
              response?.error ?? "插件未响应，请确认插件已安装并重试"
            );
          }
        }
      );
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "授权失败，请重试");
    }
  }

  if (!extensionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>授权插件登录</CardTitle>
          <CardDescription>
            请从网兜浏览器插件中点击「使用网页账号登录」打开本页面
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="size-5" />
          授权插件登录
        </CardTitle>
        <CardDescription>
          将以 <span className="font-medium text-foreground">{email}</span>{" "}
          的身份登录网兜浏览器插件
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {state === "done" ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
            <CheckCircle2 className="size-5 shrink-0" />
            授权成功！插件已登录，可以关闭本页面了。
          </div>
        ) : (
          <>
            <Button
              className="w-full"
              onClick={handleAuthorize}
              disabled={state === "loading"}
            >
              {state === "loading" ? "授权中..." : "授权插件"}
            </Button>
            {message && <p className="text-sm text-destructive">{message}</p>}
            <p className="text-xs text-muted-foreground">
              授权会为插件创建独立的登录会话，不影响网页端登录状态。
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
