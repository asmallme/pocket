import type { ExtractedPage } from "./extract";

const JUNK_PATTERN =
  /(?:cache\s*hit|cache\s*miss|\$\s*\d|(?:^|\s)Input(?:\s|$)|(?:^|\s)Output(?:\s|$))/i;

function firstLine(text: string, max = 120): string {
  const line = text.split(/\r?\n/)[0]?.trim() ?? text.trim();
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

function isJunkText(text: string | null): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < 2) return true;
  if (JUNK_PATTERN.test(trimmed)) return true;
  if (trimmed.split(/\r?\n/).length > 3) return true;
  const dollarCount = (trimmed.match(/\$/g) ?? []).length;
  if (dollarCount >= 2) return true;
  return false;
}

/** 清理页面内提取的标题与摘要，去掉定价表等噪音。 */
export function sanitizeExtracted(page: ExtractedPage): ExtractedPage {
  let title = page.title.trim();
  if (isJunkText(title)) {
    try {
      title = new URL(page.url).hostname;
    } catch {
      title = "未命名页面";
    }
  } else {
    title = firstLine(title);
  }

  const description = isJunkText(page.description) ? null : firstLine(page.description!, 160);

  return {
    ...page,
    title,
    description,
  };
}

/** 合并页面提取与服务端 unfurl 结果，优先更干净的字段。 */
export function mergePageMeta(
  extracted: ExtractedPage,
  unfurled: { title: string | null; description: string | null; image: string | null } | null
): ExtractedPage {
  const base = sanitizeExtracted(extracted);
  if (!unfurled) return base;

  const title =
    unfurled.title && !isJunkText(unfurled.title)
      ? firstLine(unfurled.title)
      : base.title;

  const description =
    unfurled.description && !isJunkText(unfurled.description)
      ? firstLine(unfurled.description, 160)
      : base.description;

  return {
    url: base.url,
    title,
    description: description && description !== title ? description : null,
    image: unfurled.image || base.image,
  };
}
