"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Share2,
  Smartphone,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type MobileShareTokenInfo = {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
};

const REQUEST_BODY_EXAMPLE = `{
  "url": "共享输入中的 URL（如果有）",
  "title": "共享输入的标题（可选）",
  "text": "共享输入的文本（可选）",
  "is_public": false
}`;

export function MobileShareTokenCard({
  initialToken,
  autoFocus = false,
}: {
  initialToken: MobileShareTokenInfo | null;
  autoFocus?: boolean;
}) {
  const [working, setWorking] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<MobileShareTokenInfo | null>(
    initialToken
  );
  const [plainToken, setPlainToken] = useState<string | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const apiUrl = useMemo(() => `${origin}/api/mobile-share`, [origin]);
  const authHeader = plainToken
    ? `Bearer ${plainToken}`
    : "Bearer <生成后的 Token>";

  useEffect(() => {
    if (!autoFocus) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById("ios-shortcut")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [autoFocus]);

  async function generateToken() {
    setWorking(true);
    try {
      const res = await fetch("/api/mobile-share-token", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlainToken(data.token);
      setTokenInfo(data.token_info);
      toast.success("Token 已生成，只会显示这一次");
    } catch {
      toast.error("生成失败，请重试");
    } finally {
      setWorking(false);
    }
  }

  async function revokeToken() {
    setWorking(true);
    try {
      const res = await fetch("/api/mobile-share-token", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPlainToken(null);
      setTokenInfo(null);
      toast.success("Token 已撤销");
    } catch {
      toast.error("撤销失败，请重试");
    } finally {
      setWorking(false);
    }
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`${label}已复制`);
  }

  return (
    <Card id="ios-shortcut" className="scroll-mt-20">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Smartphone className="size-4" />
          </span>
          <div>
            <CardTitle className="text-base">iOS 快捷指令收藏</CardTitle>
            <CardDescription className="mt-1">
              在 Safari、X App 等应用里用系统分享面板，一键把链接和文本保存到 Pocket。
              iOS 暂不支持 PWA Share Target，因此通过快捷指令接入。
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {tokenInfo ? (
              <>
                <CheckCircle2 className="size-4 text-primary" />
                已启用
              </>
            ) : (
              <>
                <KeyRound className="size-4 text-muted-foreground" />
                尚未生成 Token
              </>
            )}
          </div>
          <p className="mt-2">
            保存默认私密，避免手机随手分享时误公开。Token
            只在生成时显示一次，泄露后请立即撤销并重新生成。
          </p>
          {tokenInfo && (
            <p className="mt-2">
              创建时间：{new Date(tokenInfo.created_at).toLocaleString("zh-CN")}
              {tokenInfo.last_used_at
                ? `；最近使用：${new Date(tokenInfo.last_used_at).toLocaleString("zh-CN")}`
                : "；尚未使用"}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void generateToken()}
            disabled={working}
          >
            {working ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {tokenInfo ? "重新生成 Token" : "生成 Token"}
          </Button>
          {tokenInfo && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void revokeToken()}
              disabled={working}
            >
              <Trash2 className="size-4" />
              撤销 Token
            </Button>
          )}
        </div>

        {plainToken && (
          <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
            <Label htmlFor="mobile-share-token">Token（只显示这一次）</Label>
            <div className="flex gap-2">
              <Input
                id="mobile-share-token"
                readOnly
                value={plainToken}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void copy(plainToken, "Token")}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-medium">快捷指令配置参数</h3>
          <CopyField
            id="mobile-share-url"
            label="请求地址"
            value={apiUrl}
            onCopy={() => void copy(apiUrl, "请求地址")}
          />
          <CopyField
            id="mobile-share-auth"
            label="Authorization 请求头"
            value={authHeader}
            onCopy={() =>
              void copy(
                authHeader,
                plainToken ? "Authorization" : "Authorization 模板"
              )
            }
          />
          <CopyField
            id="mobile-share-content-type"
            label="Content-Type 请求头"
            value="application/json"
            onCopy={() => void copy("application/json", "Content-Type")}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>请求体 JSON</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => void copy(REQUEST_BODY_EXAMPLE, "请求体")}
              >
                <Copy className="size-3.5" />
                复制
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs leading-relaxed">
              {REQUEST_BODY_EXAMPLE}
            </pre>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-sm font-medium">
            <Share2 className="size-4 text-primary" />
            配置步骤
          </h3>
          <ol className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                1
              </span>
              <span>
                点击上方「生成 Token」，复制 Token。它只会显示一次。
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                2
              </span>
              <span>
                打开 iOS「快捷指令」App，新建快捷指令，打开「在共享表单中显示」，接收类型勾选
                URL 和文本。
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                3
              </span>
              <span>
                添加「获取 URL 内容」动作，方法选 POST，URL
                填上方请求地址，并添加 Authorization、Content-Type 两个请求头。
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                4
              </span>
              <span>
                请求体使用上方 JSON。把共享输入中的链接、标题、文本映射到对应字段；
                <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
                  is_public
                </code>
                建议保持
                <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
                  false
                </code>
                。
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                5
              </span>
              <span>
                在 Safari 或 X App 打开任意内容，点系统分享 → 选择该快捷指令即可收藏。
              </span>
            </li>
          </ol>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
          <h3 className="text-sm font-medium">会保存什么</h3>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <li>Safari 分享网页：保存链接，并自动抓取标题、摘要和封面。</li>
            <li>X App 分享帖子：优先抽取文本里的链接，帖子文字作为推荐语。</li>
            <li>只有文本没有链接：保存为私密文字收藏。</li>
            <li>保存成功后会尽量在后台触发 AI 摘要与自动标签。</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function CopyField({
  id,
  label,
  value,
  onCopy,
}: {
  id: string;
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          readOnly
          value={value}
          className="font-mono text-xs"
        />
        <Button type="button" variant="outline" size="icon" onClick={onCopy}>
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}
