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
  // Matches <meta property="og:title" content="..."> with property/content in either order.
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

    // Only read the first 512KB — meta tags live in <head>.
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      while (bytes < 512 * 1024) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        html += decoder.decode(value, { stream: true });
        if (html.includes("</head>")) break;
      }
      reader.cancel().catch(() => {});
    }

    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    let image = extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image");
    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, url).toString();
      } catch {
        image = null;
      }
    }

    return {
      url: url.toString(),
      title:
        extractMeta(html, "og:title") ??
        extractMeta(html, "twitter:title") ??
        (titleTag ? decodeEntities(titleTag) : null),
      description:
        extractMeta(html, "og:description") ??
        extractMeta(html, "twitter:description") ??
        extractMeta(html, "description"),
      image,
      siteName: extractMeta(html, "og:site_name"),
    };
  } finally {
    clearTimeout(timeout);
  }
}
