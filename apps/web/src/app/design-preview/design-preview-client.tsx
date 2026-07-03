"use client";

import { useState } from "react";
import {
  Bookmark,
  Globe,
  Heart,
  MessageCircle,
  Plus,
  Sparkles,
  Tags,
} from "lucide-react";
import { appThemes } from "@/lib/themes";
import { cn } from "@/lib/utils";

const mockCard = {
  author: "小林",
  time: "2 小时前",
  quote: "好的策展不是堆链接，而是帮读者在三秒内判断：这篇值不值得读。",
  ai: "文章讨论信息流产品的策展逻辑，核心观点是降低筛选成本、突出收藏者判断。",
  title: "为什么我们需要「人工过滤」的信息流",
  host: "every.to",
  tags: ["产品设计", "策展"],
};

function Swatch({ label, cssVar }: { label: string; cssVar: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="size-9 rounded-md border border-[var(--border)]"
        style={{ background: `var(${cssVar})` }}
      />
      <span className="text-[10px] text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

function ThemePreview({
  mode,
  themeId,
}: {
  mode: "light" | "dark";
  themeId: string;
}) {
  const theme = appThemes.find((t) => t.id === themeId)!;
  const vars = mode === "light" ? theme.light : theme.dark;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--border)]",
        mode === "dark" && "ring-1 ring-white/5"
      )}
      style={
        {
          ...vars,
        } as React.CSSProperties
      }
    >
      <div className="bg-[var(--background)] text-[var(--foreground)]">
        {/* mini header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/90 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Bookmark className="size-4 text-[var(--primary)]" />
            Pocket
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            >
              <Tags className="size-4" />
            </button>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)]"
            >
              <Plus className="size-3.5" />
              收藏
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {/* tabs */}
          <div className="flex gap-1 rounded-[var(--radius)] bg-[var(--muted)] p-1">
            {["发现", "关注", "标签订阅"].map((tab, i) => (
              <button
                key={tab}
                type="button"
                className={cn(
                  "flex-1 rounded-[calc(var(--radius)-2px)] py-1.5 text-xs font-medium transition-colors",
                  i === 0
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* bookmark card */}
          <article className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 text-[var(--card-foreground)]">
            <div className="mb-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <div className="flex size-6 items-center justify-center rounded-full bg-[var(--secondary)] text-[10px] font-semibold text-[var(--secondary-foreground)]">
                {mockCard.author[0]}
              </div>
              <span className="font-medium text-[var(--foreground)]">
                {mockCard.author}
              </span>
              <span>· {mockCard.time}</span>
            </div>

            <blockquote
              className="mb-3 rounded-r-[var(--radius)] border-l-[3px] border-[var(--quote)] bg-[var(--quote-bg)] py-2 pl-3 pr-2 text-[15px] font-medium leading-relaxed"
              style={{ fontFamily: theme.fontQuote }}
            >
              {mockCard.quote}
            </blockquote>

            <p className="mb-3 flex gap-1.5 text-xs leading-relaxed text-[var(--ai)]">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 opacity-80" />
              <span className="line-clamp-2">{mockCard.ai}</span>
            </p>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {mockCard.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--secondary)] px-2.5 py-0.5 text-[11px] text-[var(--secondary-foreground)]"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <a
              href="#"
              className="flex gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)]/50 p-3 transition-colors hover:bg-[var(--muted)]"
            >
              <div className="size-14 shrink-0 rounded-md bg-[var(--border)]" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">
                  {mockCard.title}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                  <Globe className="size-3" />
                  {mockCard.host}
                </p>
              </div>
            </a>

            <div className="mt-3 flex items-center gap-1 text-[var(--muted-foreground)]">
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs hover:bg-[var(--accent)]"
              >
                <Heart className="size-3.5" /> 12
              </button>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs hover:bg-[var(--accent)]"
              >
                <MessageCircle className="size-3.5" />3
              </button>
            </div>
          </article>

          {/* palette */}
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <Swatch label="背景" cssVar="--background" />
            <Swatch label="正文" cssVar="--foreground" />
            <Swatch label="主色" cssVar="--primary" />
            <Swatch label="金句" cssVar="--quote" />
            <Swatch label="AI" cssVar="--ai" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesignPreviewClient() {
  const [activeId, setActiveId] = useState(appThemes[0].id);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const active = appThemes.find((t) => t.id === activeId)!;

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">UI 方向预览 · 仅供选型</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pocket 视觉方向
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          围绕「策展阅读、安静边界、金句判断」四个方向各做一套 token。
          选定后可一键应用到全站。
        </p>
      </div>

      {/* theme picker */}
      <div className="flex flex-wrap gap-2">
        {appThemes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-left transition-colors",
              activeId === t.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card hover:bg-muted"
            )}
          >
            <span className="block text-sm font-medium">{t.name}</span>
            <span
              className={cn(
                "block text-xs",
                activeId === t.id
                  ? "text-background/70"
                  : "text-muted-foreground"
              )}
            >
              {t.tagline}
            </span>
          </button>
        ))}
      </div>

      {/* mode toggle */}
      <div className="flex gap-2">
        {(["light", "dark"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              mode === m
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            )}
          >
            {m === "light" ? "浅色" : "深色"}
          </button>
        ))}
      </div>

      {/* active theme info */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <h2 className="text-lg font-semibold">{active.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{active.tagline}</p>
      </div>

      {/* preview */}
      <div className="mx-auto max-w-md">
        <ThemePreview mode={mode} themeId={activeId} />
      </div>

      {/* compare grid */}
      <div>
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">
          四方向并列对比（{mode === "light" ? "浅色" : "深色"}）
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          {appThemes.map((t) => (
            <div key={t.id}>
              <p className="mb-2 text-center text-xs font-medium text-muted-foreground">
                {t.name} · {t.tagline}
              </p>
              <ThemePreview mode={mode} themeId={t.id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
