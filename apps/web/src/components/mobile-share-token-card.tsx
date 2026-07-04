"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
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
import { cn } from "@/lib/utils";

export type MobileShareTokenInfo = {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
};

/** 可选：在 Vercel 配置已发布的 iCloud 快捷指令链接，实现真正一键安装 */
const TEMPLATE_LINK = process.env.NEXT_PUBLIC_IOS_SHORTCUT_LINK ?? "";

function buildSetupGuide(apiUrl: string, token: string) {
  return `Pocket iOS 快捷指令配置包
========================

【请求地址】
${apiUrl}

【Authorization 请求头】
Bearer ${token}

【Content-Type 请求头】
application/json

【请求体 JSON】
把「快捷指令输入」作为 text 字段即可，Pocket 会自动从文本里抽取链接：

{
  "text": "这里填快捷指令输入",
  "is_public": false
}

========================
详细配置步骤（iPhone）
========================

一、准备 Token
1. Token 已生成（见上方 Authorization）。
2. Token 只显示一次，请勿发给他人；泄露后请在个人中心撤销。

二、新建快捷指令
1. 打开 iPhone 自带的「快捷指令」App。
2. 点右上角「+」新建快捷指令。
3. 点顶部快捷指令名称，改成「收藏到 Pocket」。
4. 点右上角「ⓘ」或底部「快捷指令详情」。
5. 打开「在共享表单中显示」。
6. 点「选取类型」：
   - 勾选「URL」
   - 勾选「文本」
   - 其他类型可关闭
7. 返回编辑页面。

三、添加网络请求
1. 点「添加操作」。
2. 搜索「获取 URL 的内容」（有的系统显示为「获取URL内容」）。
3. 点选该操作。
4. 点操作右侧展开箭头，做如下设置：
   - 「URL」：粘贴 ${apiUrl}
   - 「方法」：改为 POST
   - 「标头」：点「添加新字段」两次
       键：Authorization
       值：Bearer ${token}
       键：Content-Type
       值：application/json
   - 「请求体」：选择 JSON
   - 在 JSON 中添加字段：
       键：text
       值：点选「快捷指令输入」（魔法变量，来自共享表单）
       键：is_public
       值：false（可先加文本字段写 false）

四、保存并试用
1. 点右上角「完成」保存。
2. 打开 Safari 任意网页，点底部分享按钮。
3. 左右滑动分享菜单，找到「收藏到 Pocket」并点选。
4. 回到 Pocket「我的收藏」，应能看到刚保存的内容（默认私密）。

五、X App / 其他 App
1. 在 X App 打开一条帖子，点分享。
2. 选择「收藏到 Pocket」。
3. 帖子链接和文字会一并提交；Pocket 会优先抽取链接，其余文字作为推荐语。

常见问题
- 分享菜单里找不到：确认已打开「在共享表单中显示」，并勾选了 URL / 文本。
- 401 错误：Token 错误或已撤销，请回个人中心重新生成。
- 没有反应：检查请求地址是否为生产域名，且手机网络可访问该网站。
`;
}

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
  const [showGuide, setShowGuide] = useState(true);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const apiUrl = useMemo(() => `${origin}/api/mobile-share`, [origin]);
  const authHeader = plainToken
    ? `Bearer ${plainToken}`
    : "Bearer <请先生成 Token>";

  useEffect(() => {
    if (!autoFocus) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById("ios-shortcut")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [autoFocus]);

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`${label}已复制`);
  }

  async function generateToken(options?: { copyGuide?: boolean }) {
    setWorking(true);
    try {
      const res = await fetch("/api/mobile-share-token", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const token = data.token as string;
      setPlainToken(token);
      setTokenInfo(data.token_info);
      setShowGuide(true);

      if (options?.copyGuide) {
        await navigator.clipboard.writeText(buildSetupGuide(apiUrl, token));
        toast.success("Token 已生成，完整配置步骤已复制");
      } else {
        toast.success("Token 已生成，只会显示这一次");
      }
    } catch {
      toast.error("生成失败，请重试");
    } finally {
      setWorking(false);
    }
  }

  async function copyFullGuide() {
    if (!plainToken) {
      await generateToken({ copyGuide: true });
      return;
    }
    await copy(buildSetupGuide(apiUrl, plainToken), "完整配置步骤");
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
              在 Safari、X App 等应用的系统分享菜单里，一键收藏到 Pocket。
              推荐先点「一键生成并复制配置」，再到快捷指令 App 按步骤粘贴。
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
            保存默认私密。Token 只在生成时显示一次；泄露后请立即撤销并重新生成。
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

        <div className="space-y-2">
          <Button
            type="button"
            className="w-full"
            onClick={() => void copyFullGuide()}
            disabled={working}
          >
            {working ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Copy className="size-4" />
            )}
            {plainToken ? "一键复制完整配置步骤" : "一键生成并复制完整配置"}
          </Button>

          {TEMPLATE_LINK && (
            <Button asChild type="button" variant="secondary" className="w-full">
              <a href={TEMPLATE_LINK} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                一键添加快捷指令模板
              </a>
            </Button>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void generateToken()}
              disabled={working}
            >
              {working ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {tokenInfo ? "重新生成 Token" : "仅生成 Token"}
            </Button>
            {tokenInfo && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void revokeToken()}
                disabled={working}
              >
                <Trash2 className="size-4" />
                撤销
              </Button>
            )}
          </div>

          {TEMPLATE_LINK ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              若使用「一键添加快捷指令模板」：安装后第一次运行时，把下方 Token
              粘贴进快捷指令提示框即可。
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              目前最省事的方式：点上方主按钮，把配置步骤粘贴到备忘录，再在
              iPhone「快捷指令」App 里对照填写。约 2–3 分钟。
            </p>
          )}
        </div>

        {plainToken && (
          <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
            <CopyField
              id="mobile-share-token"
              label="Token（只显示这一次）"
              value={plainToken}
              onCopy={() => void copy(plainToken, "Token")}
            />
            <CopyField
              id="mobile-share-url"
              label="请求地址"
              value={apiUrl}
              onCopy={() => void copy(apiUrl, "请求地址")}
            />
            <CopyField
              id="mobile-share-auth"
              label="Authorization"
              value={authHeader}
              onCopy={() => void copy(authHeader, "Authorization")}
            />
          </div>
        )}

        <div className="rounded-lg border">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-medium"
            onClick={() => setShowGuide((v) => !v)}
          >
            详细配置步骤（照着做）
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                showGuide && "rotate-180"
              )}
            />
          </button>

          {showGuide && (
            <div className="space-y-4 border-t px-3 py-4 text-sm leading-relaxed text-muted-foreground">
              <GuideStep index={1} title="生成并复制配置">
                点本页主按钮「一键生成并复制完整配置」。系统会生成 Token，并把含请求地址、请求头、逐步说明的配置包复制到剪贴板。建议先粘贴到「备忘录」，方便一边看一边填。
              </GuideStep>

              <GuideStep index={2} title="新建快捷指令">
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                  <li>打开 iPhone 自带「快捷指令」App。</li>
                  <li>点右上角「+」。</li>
                  <li>点顶部名称，改成「收藏到 Pocket」。</li>
                  <li>点右上角「ⓘ」打开详情。</li>
                  <li>打开「在共享表单中显示」。</li>
                  <li>
                    点「选取类型」，勾选「URL」和「文本」，其他可关掉。
                  </li>
                  <li>返回编辑页。</li>
                </ol>
              </GuideStep>

              <GuideStep index={3} title="添加「获取 URL 的内容」">
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                  <li>点「添加操作」。</li>
                  <li>搜索并选择「获取 URL 的内容」。</li>
                  <li>点该操作右侧箭头展开高级选项。</li>
                  <li>
                    「URL」粘贴：
                    <code className="mx-1 break-all rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                      {apiUrl || "https://你的域名/api/mobile-share"}
                    </code>
                  </li>
                  <li>「方法」改为 <strong className="text-foreground">POST</strong>。</li>
                </ol>
              </GuideStep>

              <GuideStep index={4} title="填写请求头">
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                  <li>找到「标头」，点「添加新字段」。</li>
                  <li>
                    第一行：键填{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                      Authorization
                    </code>
                    ，值填{" "}
                    <code className="break-all rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                      {authHeader}
                    </code>
                  </li>
                  <li>
                    再添加一行：键填{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                      Content-Type
                    </code>
                    ，值填{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                      application/json
                    </code>
                  </li>
                </ol>
              </GuideStep>

              <GuideStep index={5} title="填写请求体（最简单写法）">
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                  <li>「请求体」选择 <strong className="text-foreground">JSON</strong>。</li>
                  <li>
                    添加字段{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                      text
                    </code>
                    ，值选择魔法变量「快捷指令输入」（共享表单传进来的内容）。
                  </li>
                  <li>
                    再添加字段{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                      is_public
                    </code>
                    ，值填{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                      false
                    </code>
                    （保持私密）。
                  </li>
                  <li>
                    不需要手动拆链接：Pocket
                    会从文本里自动抽取第一个网址；没有网址就存成文字收藏。
                  </li>
                </ol>
              </GuideStep>

              <GuideStep index={6} title="保存并测试">
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                  <li>点右上角「完成」。</li>
                  <li>打开 Safari 任意网页 → 底部分享按钮。</li>
                  <li>在分享菜单中找到「收藏到 Pocket」并点选。</li>
                  <li>回到 Pocket「我的收藏」，确认已出现该内容。</li>
                  <li>X App 同理：帖子分享菜单里选「收藏到 Pocket」。</li>
                </ol>
              </GuideStep>

              <div className="rounded-md border border-dashed bg-muted/20 p-3 text-xs">
                <p className="font-medium text-foreground">排错</p>
                <ul className="mt-1.5 space-y-1">
                  <li>分享菜单没有 Pocket：检查是否打开「在共享表单中显示」，并勾选 URL / 文本。</li>
                  <li>返回 401：Token 错了或已撤销，重新生成后再改 Authorization。</li>
                  <li>完全没反应：确认请求地址是当前网站的生产域名，手机能打开该网站。</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GuideStep({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
        {index}
      </span>
      <div className="min-w-0">
        <h4 className="font-medium text-foreground">{title}</h4>
        <div className="mt-1">{children}</div>
      </div>
    </div>
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
        <Input id={id} readOnly value={value} className="font-mono text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={onCopy}>
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}
