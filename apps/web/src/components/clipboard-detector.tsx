"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const STORAGE_KEY = "pocket:last-clipboard-url";

/**
 * On focus, checks the clipboard for a URL and offers to save it.
 * This is the main mobile capture entry point: copy a link in any app,
 * then open 网兜.
 */
export function ClipboardDetector() {
  const router = useRouter();
  const checkedRef = useRef(false);

  useEffect(() => {
    async function check() {
      if (checkedRef.current) return;
      checkedRef.current = true;

      if (!navigator.clipboard?.readText) return;
      let text: string;
      try {
        text = await navigator.clipboard.readText();
      } catch {
        return; // Permission denied; skip quietly.
      }

      const trimmed = text.trim();
      if (!/^https?:\/\/\S+$/.test(trimmed)) return;
      if (sessionStorage.getItem(STORAGE_KEY) === trimmed) return;
      sessionStorage.setItem(STORAGE_KEY, trimmed);

      toast("检测到剪贴板中的链接", {
        description:
          trimmed.length > 60 ? trimmed.slice(0, 60) + "..." : trimmed,
        action: {
          label: "收藏",
          onClick: () => router.push(`/save?url=${encodeURIComponent(trimmed)}`),
        },
        duration: 8000,
      });
    }

    void check();
  }, [router]);

  return null;
}
