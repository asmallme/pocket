export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** 推荐语是否只是链接本身（不应作为金句展示）。 */
export function isRedundantNote(
  note: string | null | undefined,
  url: string | null | undefined
): boolean {
  if (!note) return true;
  const trimmed = note.trim();
  if (!trimmed) return true;

  if (url) {
    const normalizedNote = trimmed.replace(/\/$/, "");
    const normalizedUrl = url.replace(/\/$/, "");
    if (normalizedNote === normalizedUrl) return true;
  }

  // 去掉所有 URL 后没有实质文字
  const withoutUrls = trimmed.replace(/https?:\/\/[^\s<>"']+/gi, "").trim();
  if (!withoutUrls) return true;

  // 整段就是一个 URL（含查询参数）
  if (/^https?:\/\/\S+$/i.test(trimmed)) return true;

  return false;
}

/** 链接卡片标题：避免把超长 URL 当标题展示。 */
export function displayLinkTitle(
  title: string | null | undefined,
  url: string | null | undefined
): string {
  const host = hostnameOf(url);
  const fallback = host ? `${host} 上的链接` : "未命名链接";
  if (!title?.trim()) return fallback;

  const text = title.trim();
  if (url) {
    const normalizedTitle = text.replace(/\/$/, "");
    const normalizedUrl = url.replace(/\/$/, "");
    if (normalizedTitle === normalizedUrl || text.startsWith(url)) {
      return fallback;
    }
  }
  if (/^https?:\/\//i.test(text)) return fallback;
  return text;
}
