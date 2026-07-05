import type { UnfurlResult } from "@pocket/shared";

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^169\.254\./,
];

const CHARSET_ALIASES: Record<string, string> = {
  gb2312: "gbk",
  "gb-2312": "gbk",
  gbk: "gbk",
  gb18030: "gb18030",
  "utf-8": "utf-8",
  utf8: "utf-8",
  "utf-16": "utf-16le",
  "utf-16le": "utf-16le",
  "utf-16be": "utf-16be",
  big5: "big5",
  "big5-hkscs": "big5",
};

export function isSafeUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (PRIVATE_HOST_PATTERNS.some((p) => p.test(url.hostname))) return null;
  return url;
}

function extractMeta(html: string, key: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1].trim());
  }
  return null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ");
}

function normalizeCharset(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/['"]/g, "");
  return CHARSET_ALIASES[key] ?? null;
}

function charsetFromContentType(contentType: string): string | null {
  const match = contentType.match(/charset\s*=\s*([^\s;]+)/i);
  return normalizeCharset(match?.[1]);
}

/** 从原始字节里嗅探 meta charset（先按 latin1 读，只用于找声明）。 */
function charsetFromBytes(bytes: Uint8Array): string | null {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
  const patterns = [
    /<meta[^>]+charset\s*=\s*["']?([a-zA-Z0-9_\-]+)/i,
    /<meta[^>]+content=["'][^"']*charset\s*=\s*([a-zA-Z0-9_\-]+)[^"']*["']/i,
  ];
  for (const pattern of patterns) {
    const match = head.match(pattern);
    const charset = normalizeCharset(match?.[1]);
    if (charset) return charset;
  }
  return null;
}

function replacementRatio(text: string): number {
  if (!text) return 0;
  const sample = text.slice(0, 2000);
  const bad = (sample.match(/\uFFFD/g) ?? []).length;
  return bad / Math.max(sample.length, 1);
}

function looksMostlyGarbled(text: string): boolean {
  if (!text) return false;
  // UTF-8 误读 GBK 时会出现大量 U+FFFD 替换字符
  return replacementRatio(text) > 0.02;
}

function decodeHtmlBytes(bytes: Uint8Array, contentType: string): string {
  const candidates = [
    charsetFromContentType(contentType),
    charsetFromBytes(bytes),
    "utf-8",
    "gbk",
    "gb18030",
  ].filter((v, i, arr): v is string => !!v && arr.indexOf(v) === i);

  let best = "";
  let bestScore = Number.POSITIVE_INFINITY;

  for (const charset of candidates) {
    try {
      const text = new TextDecoder(charset, { fatal: false }).decode(bytes);
      const score = replacementRatio(text);
      if (score < bestScore) {
        best = text;
        bestScore = score;
      }
      // utf-8 无替换字符时直接采用
      if (charset === "utf-8" && score === 0 && !looksMostlyGarbled(text)) {
        return text;
      }
      // 声明的编码解码质量足够好
      if (
        (charset === candidates[0] || charset === candidates[1]) &&
        score < 0.005
      ) {
        return text;
      }
    } catch {
      // 尝试下一个编码
    }
  }

  return best;
}

async function readBodyBytes(
  res: Response,
  limit = 512 * 1024,
  readFullBody = false
): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf.subarray(0, limit);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  let headLatin1 = "";

  while (total < limit) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const next = value.subarray(0, limit - total);
    chunks.push(next);
    total += next.length;
    headLatin1 += new TextDecoder("latin1").decode(next);
    if (!readFullBody) {
      // 通用链接：head 里的 meta 足够
      if (headLatin1.includes("</head>") || headLatin1.includes("</HEAD>")) {
        break;
      }
    } else {
      const contentStart = headLatin1.indexOf('id="js_content"');
      if (contentStart >= 0) {
        const afterContent = headLatin1.slice(contentStart);
        // 正文区结束于紧随其后的 </div><script
        if (/<\/div>\s*<script/i.test(afterContent)) {
          break;
        }
        // 已读到正文开头但尚未结束，继续拉取
        if (afterContent.length > 120_000) break;
      }
    }
  }
  reader.cancel().catch(() => {});

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function cleanText(value: string | null): string | null {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || looksMostlyGarbled(text)) return null;
  return text;
}

const WECHAT_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49 NetType/WIFI Language/zh_CN";

/** 微信文章正文区通常在 500KB+ 处，需多读一些 HTML。 */
const WECHAT_READ_LIMIT = 896 * 1024;

function isWeixinArticleUrl(url: URL): boolean {
  return url.hostname === "mp.weixin.qq.com" && /^\/s(\/|$)/.test(url.pathname);
}

function extractScriptVar(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`var\\s+${name}\\s*=\\s*'([^']*)'`, "i"),
    new RegExp(`var\\s+${name}\\s*=\\s*"([^"]*)"`, "i"),
    new RegExp(`var\\s+${name}\\s*=\\s*htmlDecode\\("([^"]*)"\\)`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1].trim());
  }
  return null;
}

function extractElementInnerText(html: string, id: string): string | null {
  const match = html.match(
    new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)<\\/(?:h1|a|span|div|p|section)>`, "i")
  );
  if (!match?.[1]) return null;
  return cleanText(match[1].replace(/<[^>]+>/g, " "));
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

const WECHAT_INTRO_SKIP =
  /^(?:Hi[～~].*关注我们|点击下方.*阅读原文|点击上方.*关注我们|长按.*识别|阅读原文|在看|分享|收藏|点赞)/;

function extractWeixinContentIntro(html: string, maxLen = 300): string | null {
  const match = html.match(/id="js_content"[^>]*>([\s\S]*?)<\/div>\s*<script/i);
  if (!match?.[1]) return null;

  const paragraphs = stripHtmlToText(match[1])
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    if (paragraph.length < 20) continue;
    if (WECHAT_INTRO_SKIP.test(paragraph)) continue;
    return paragraph.slice(0, maxLen);
  }

  const fallback = paragraphs.find((p) => p.length >= 20);
  return fallback ? fallback.slice(0, maxLen) : null;
}

function isWeixinBlocked(html: string): boolean {
  return (
    /环境异常|secitptpage|verifybar|captcha/i.test(html) &&
    !/id="js_content"/i.test(html)
  );
}

function parseWeixinArticle(html: string, baseUrl: URL): UnfurlResult {
  const title =
    extractMeta(html, "og:title") ??
    extractScriptVar(html, "msg_title") ??
    extractElementInnerText(html, "activity-name");

  const author =
    extractMeta(html, "og:article:author") ??
    extractMeta(html, "author") ??
    extractElementInnerText(html, "js_name");

  let description =
    extractMeta(html, "og:description") ??
    extractScriptVar(html, "msg_desc") ??
    extractWeixinContentIntro(html);

  if (author && description && !description.includes(author)) {
    description = `${author} · ${description}`;
  } else if (author && !description) {
    description = `公众号：${author}`;
  }

  let image =
    extractMeta(html, "og:image") ??
    extractMeta(html, "twitter:image") ??
    extractScriptVar(html, "msg_cdn_url");

  if (image && !image.startsWith("http")) {
    try {
      image = new URL(image, baseUrl).toString();
    } catch {
      image = null;
    }
  }

  if (!image) {
    const imgMatch = html.match(
      /id="js_content"[\s\S]{0,8000}?data-src="([^"]+)"/i
    );
    if (imgMatch?.[1]) {
      try {
        image = new URL(decodeEntities(imgMatch[1]), baseUrl).toString();
      } catch {
        image = null;
      }
    }
  }

  return {
    url: baseUrl.toString(),
    title: cleanText(title),
    description: cleanText(description),
    image,
    siteName: cleanText(author) ?? "微信公众号",
  };
}

export async function unfurl(rawUrl: string): Promise<UnfurlResult> {
  const url = isSafeUrl(rawUrl);
  if (!url) throw new Error("无效的链接");

  const isWeixin = isWeixinArticleUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": isWeixin
          ? WECHAT_USER_AGENT
          : "Mozilla/5.0 (compatible; PocketBot/1.0; +https://pocket.example.com)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return {
        url: url.toString(),
        title: null,
        description: null,
        image: null,
        siteName: null,
      };
    }

    const bytes = await readBodyBytes(
      res,
      isWeixin ? WECHAT_READ_LIMIT : 512 * 1024,
      isWeixin
    );
    const html = decodeHtmlBytes(bytes, contentType).replace(/\0/g, "");

    if (isWeixin) {
      if (isWeixinBlocked(html)) {
        return {
          url: url.toString(),
          title: null,
          description: null,
          image: null,
          siteName: "微信公众号",
        };
      }
      return parseWeixinArticle(html, url);
    }

    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    let image =
      extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image");
    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, url).toString();
      } catch {
        image = null;
      }
    }

    return {
      url: url.toString(),
      title: cleanText(
        extractMeta(html, "og:title") ??
          extractMeta(html, "twitter:title") ??
          (titleTag ? decodeEntities(titleTag) : null)
      ),
      description: cleanText(
        extractMeta(html, "og:description") ??
          extractMeta(html, "twitter:description") ??
          extractMeta(html, "description")
      ),
      image,
      siteName: cleanText(extractMeta(html, "og:site_name")),
    };
  } finally {
    clearTimeout(timeout);
  }
}
