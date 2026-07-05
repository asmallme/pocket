"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

export const siteFooterLinks = [
  { href: "/about", label: "产品介绍" },
  { href: "/privacy", label: "隐私政策" },
  { href: "/terms", label: "用户协议" },
] as const;

export function SiteFooter() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  return (
    <footer
      aria-label="站点信息"
      className="mt-10 border-t border-border/70 pt-6 md:mt-14 md:pt-8"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            <Bookmark className="size-3.5 text-primary" />
            网兜
          </Link>
          <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground md:text-left">
            收藏你在全网看到的好内容，分享给同样热爱阅读的人。
          </p>
        </div>

        <nav
          aria-label="法律与介绍"
          className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-xs md:justify-end"
        >
          {siteFooterLinks.map((link, index) => (
            <span key={link.href} className="inline-flex items-center">
              {index > 0 && (
                <span className="mx-2 text-border select-none" aria-hidden>
                  ·
                </span>
              )}
              <Link
                href={link.href}
                className={cn(
                  "rounded-sm px-0.5 py-0.5 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline",
                  pathname === link.href &&
                    "font-medium text-foreground underline decoration-primary/40"
                )}
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>

      <p className="mt-5 text-center text-[11px] text-muted-foreground/70 md:text-left">
        © {year} 网兜
      </p>
    </footer>
  );
}
