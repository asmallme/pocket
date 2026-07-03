export interface ExtractedPage {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
}

/**
 * 在页面上下文中执行的提取函数（通过 scripting.executeScript 注入，
 * 必须完全自包含，不能引用任何外部变量或 import）。
 *
 * 先走站点适配器（X / 微信公众号 / 知乎 / B站），未命中时回退到
 * 通用 Open Graph 标签提取。
 */
export function extractPageData(): ExtractedPage {
  const meta = (key: string) =>
    document
      .querySelector<HTMLMetaElement>(
        `meta[property="${key}"], meta[name="${key}"]`
      )
      ?.content?.trim() || null;

  const result: ExtractedPage = {
    url: location.href,
    title: meta("og:title") ?? document.title ?? location.href,
    description: meta("og:description") ?? meta("description"),
    image: meta("og:image") ?? meta("twitter:image"),
  };

  // 标题取首行，避免 meta 里塞入整页正文
  if (result.title) {
    result.title = result.title.split(/\r?\n/)[0].trim().slice(0, 120);
  }

  const host = location.hostname;

  try {
    if (host === "x.com" || host === "twitter.com") {
      // 单条帖子页优先取页面中第一条完整推文
      const article = document.querySelector('article[data-testid="tweet"]');
      if (article) {
        const text = (
          article.querySelector('[data-testid="tweetText"]') as HTMLElement | null
        )?.innerText?.trim();
        const author = (
          article.querySelector(
            '[data-testid="User-Name"] span'
          ) as HTMLElement | null
        )?.innerText?.trim();
        const img = article.querySelector<HTMLImageElement>(
          'img[src*="pbs.twimg.com/media"]'
        )?.src;
        if (text) {
          result.title = author
            ? `${author}：${text.slice(0, 60)}${text.length > 60 ? "…" : ""}`
            : text.slice(0, 80);
          result.description = text.slice(0, 500);
          if (img) result.image = img;
        }
      }
    } else if (host === "mp.weixin.qq.com") {
      const title = document
        .querySelector("#activity-name")
        ?.textContent?.trim();
      const author = document.querySelector("#js_name")?.textContent?.trim();
      const firstImg = document.querySelector<HTMLImageElement>(
        "#js_content img"
      );
      if (title) result.title = title;
      if (author) {
        result.description = result.description
          ? `${author} · ${result.description}`
          : `公众号：${author}`;
      }
      if (!result.image && firstImg) {
        result.image =
          firstImg.dataset.src || firstImg.src || null;
      }
    } else if (host.endsWith("zhihu.com")) {
      const question = document
        .querySelector(".QuestionHeader-title")
        ?.textContent?.trim();
      if (question) result.title = question;
      const rich = document.querySelector(
        ".AnswerItem .RichText, .Post-RichTextContainer .RichText"
      ) as HTMLElement | null;
      if (rich) {
        result.description = rich.innerText.trim().slice(0, 300);
      }
    } else if (host.endsWith("bilibili.com")) {
      const title = document.querySelector("h1")?.textContent?.trim();
      if (title) result.title = title;
      const up = document
        .querySelector(".up-name, .up-detail-top .name")
        ?.textContent?.trim();
      if (up) {
        result.description = result.description
          ? `UP主：${up} · ${result.description}`
          : `UP主：${up}`;
      }
    } else if (host === "news.ycombinator.com") {
      const title = document
        .querySelector(".titleline > a, .storylink")
        ?.textContent?.trim();
      if (title) result.title = title;
      const subtext = document.querySelector(".subtext")?.textContent?.trim();
      if (subtext) result.description = subtext.slice(0, 300);
    } else if (host === "www.reddit.com" || host === "reddit.com") {
      const title = document
        .querySelector("shreddit-post[post-title], h1")
        ?.textContent?.trim();
      if (title) result.title = title.slice(0, 120);
      const post = document.querySelector(
        '[data-test-id="post-content"]'
      ) as HTMLElement | null;
      if (post) result.description = post.innerText.trim().slice(0, 300);
    } else if (host === "sspai.com" || host.endsWith(".sspai.com")) {
      const title = document
        .querySelector("h1.article-title, h1")
        ?.textContent?.trim();
      if (title) result.title = title;
      const summary = document
        .querySelector(".article-summary, .summary")
        ?.textContent?.trim();
      if (summary) result.description = summary.slice(0, 300);
    } else if (host.endsWith("deepseek.com")) {
      const heading = document.querySelector("h1")?.textContent?.trim();
      if (heading && heading.length < 120) result.title = heading;
      if (
        result.description &&
        /(?:cache\s*hit|\$\s*\d|Input|Output)/i.test(result.description)
      ) {
        result.description = null;
      }
    }
  } catch {
    // 适配器解析失败时保留通用提取结果
  }

  return result;
}

/** 从指定 tab 中提取页面数据，注入失败（受限页面）时返回 tab 自带信息。 */
export async function extractFromTab(tab: {
  id?: number;
  url?: string;
  title?: string;
}): Promise<ExtractedPage | null> {
  if (!tab?.url || !/^https?:\/\//.test(tab.url)) return null;

  const fallback: ExtractedPage = {
    url: tab.url,
    title: tab.title ?? tab.url,
    description: null,
    image: null,
  };

  if (tab.id == null) return fallback;

  try {
    const [injection] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageData,
    });
    return (injection?.result as ExtractedPage) ?? fallback;
  } catch {
    return fallback;
  }
}
