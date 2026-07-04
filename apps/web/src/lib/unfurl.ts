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
  limit = 512 * 1024
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
    // head 结束即可，meta 都在前面
    if (headLatin1.includes("</head>") || headLatin1.includes("</HEAD>")) {
      break;
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

export async function unfurl(rawUrl: string): Promise<UnfurlResult> {
  const url = isSafeUrl(rawUrl);
  if (!url) throw new Error("无效的链接");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PocketBot/1.0; +https://pocket.example.com)",
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

    const bytes = await readBodyBytes(res);
    const html = decodeHtmlBytes(bytes, contentType);

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
