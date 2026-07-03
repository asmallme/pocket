"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, Plus, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "发现", icon: Compass, match: (p: string) => p === "/" },
  {
    href: "/my",
    label: "我的",
    icon: Bookmark,
    match: (p: string) => p === "/my" || p.startsWith("/b/"),
  },
  { href: "/save", label: "收藏", icon: Plus, match: (p: string) => p === "/save", accent: true },
  {
    href: "/tags",
    label: "标签",
    icon: Tags,
    match: (p: string) => p.startsWith("/tags"),
  },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex h-14 max-w-lg items-stretch px-2">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const isAccent = "accent" in tab && tab.accent;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
                isAccent && "-mt-3"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full transition-colors",
                  isAccent
                    ? "size-11 bg-primary text-primary-foreground shadow-sm"
                    : "size-7"
                )}
              >
                <Icon className={isAccent ? "size-5" : "size-[18px]"} />
              </span>
              {!isAccent && <span className="font-medium">{tab.label}</span>}
              {isAccent && (
                <span className="font-medium text-primary">{tab.label}</span>
              )}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
