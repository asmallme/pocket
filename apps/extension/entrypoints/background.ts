import { extractFromTab } from "@/utils/extract";
import { mergePageMeta } from "@/utils/page-meta";
import { unfurlViaWeb } from "@/utils/unfurl";
import { flushSaveQueue, saveBookmark, type SaveInput } from "@/utils/save";
import { supabase } from "@/utils/supabase";

const MENU_PAGE = "pocket-save-page";
const MENU_SELECTION = "pocket-save-selection";
const MENU_IMAGE = "pocket-save-image";
const MENU_LINK = "pocket-save-link";

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: MENU_PAGE,
      title: "收藏当前页面",
      contexts: ["page"],
    });
    browser.contextMenus.create({
      id: MENU_SELECTION,
      title: "收藏选中文字",
      contexts: ["selection"],
    });
    browser.contextMenus.create({
      id: MENU_IMAGE,
      title: "收藏这张图片",
      contexts: ["image"],
    });
    browser.contextMenus.create({
      id: MENU_LINK,
      title: "收藏这个链接",
      contexts: ["link"],
    });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    void handleContextMenu(info, tab);
  });

  browser.commands.onCommand.addListener((command) => {
    if (command === "save-page") void savePageShortcut();
  });

  // 网页授权登录：接收 /extension-auth 页面发来的一次性 token
  browser.runtime.onMessageExternal.addListener(
    (message, _sender, sendResponse) => {
      if (message?.type === "pocket-auth" && message.token_hash) {
        supabase.auth
          .verifyOtp({ type: "magiclink", token_hash: message.token_hash })
          .then(({ data, error }) => {
            if (error || !data.session) {
              sendResponse({ ok: false, error: error?.message });
            } else {
              void flushSaveQueue();
              sendResponse({ ok: true });
            }
          });
        return true; // 异步响应
      }
    }
  );

  // 浏览器启动时重试失败队列
  void flushSaveQueue();
});

async function handleContextMenu(
  info: Browser.contextMenus.OnClickData,
  tab: Browser.tabs.Tab | undefined
) {
  const page = tab ? await extractFromTab(tab) : null;
  const pageUrl = info.pageUrl ?? page?.url ?? null;

  let input: SaveInput | null = null;

  switch (info.menuItemId) {
    case MENU_PAGE:
      if (!page) break;
      input = {
        ...(await resolvePageMetaForSave(page)),
        content_type: "link",
        source: "contextmenu",
      };
      break;

    case MENU_SELECTION:
      if (!info.selectionText) break;
      input = {
        url: pageUrl,
        title: page?.title ?? pageUrl,
        content_type: "link",
        note: info.selectionText.trim().slice(0, 5000),
        source: "contextmenu",
      };
      break;

    case MENU_IMAGE:
      if (!info.srcUrl) break;
      input = {
        url: pageUrl,
        title: page?.title ?? null,
        cover_image: info.srcUrl,
        content_type: "image",
        source: "contextmenu",
      };
      break;

    case MENU_LINK: {
      if (!info.linkUrl) break;
      const meta = await unfurlViaWeb(info.linkUrl);
      input = {
        url: info.linkUrl,
        title: meta?.title ?? info.linkUrl,
        description: meta?.description ?? null,
        cover_image: meta?.image ?? null,
        content_type: "link",
        source: "contextmenu",
      };
      break;
    }
  }

  if (!input) return;
  const result = await saveBookmark(input);
  await feedback(result.status, tab?.id);
}

async function savePageShortcut() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const page = await extractFromTab(tab ?? {});
  if (!page) return;
  const enriched = await resolvePageMetaForSave(page);
  const result = await saveBookmark({
    ...enriched,
    content_type: "link",
    source: "shortcut",
  });
  await feedback(result.status, tab?.id);
}

/** 收藏前用 unfurl 补全元数据（非 AI）。 */
async function resolvePageMetaForSave(page: {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
}) {
  const unfurled = await unfurlViaWeb(page.url);
  const merged = mergePageMeta(page, unfurled);
  return {
    url: merged.url,
    title: merged.title,
    description: merged.description,
    cover_image: merged.image,
  };
}

/** 角标 + 系统通知反馈保存结果。 */
async function feedback(
  status: "saved" | "duplicate" | "queued" | "unauthenticated",
  tabId?: number
) {
  const badge: Record<string, { text: string; color: string }> = {
    saved: { text: "✓", color: "#16a34a" },
    duplicate: { text: "!", color: "#f59e0b" },
    queued: { text: "…", color: "#f59e0b" },
    unauthenticated: { text: "!", color: "#dc2626" },
  };
  const { text, color } = badge[status];

  await browser.action.setBadgeBackgroundColor({ color });
  await browser.action.setBadgeText({ text, tabId });
  setTimeout(() => {
    void browser.action.setBadgeText({ text: "", tabId });
  }, 2500);

  if (status === "saved") {
    await browser.action.setTitle({ title: "Pocket · 已收藏", tabId });
    setTimeout(() => {
      void browser.action.setTitle({ title: "Pocket 收藏", tabId });
    }, 2000);
  }

  const messages: Record<string, string | null> = {
    saved: null, // 角标已足够
    duplicate: "这个链接已经收藏过了",
    queued: "保存失败，已暂存，恢复后自动重试",
    unauthenticated: "请先点击 Pocket 插件图标登录",
  };
  const message = messages[status];
  if (message) {
    await browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("/icon/128.png"),
      title: "Pocket",
      message,
    });
  }
}
