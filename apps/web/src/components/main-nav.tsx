"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "发现", icon: Compass, match: (p: string) => p === "/" },
  { href: "/my", label: "我的收藏", icon: Bookmark, match: (p: string) => p === "/my" },
  { href: "/tags", label: "标签", icon: Tags, match: (p: string) => p.startsWith("/tags") },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {links.map((link) => {
        const active = link.match(pathname);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
