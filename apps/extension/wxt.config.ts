import { readFileSync } from "node:fs";
import { defineConfig } from "wxt";

// wxt.config 执行早于 Vite 的 env 加载，手动读取 .env 中的 WXT_WEB_URL
function readWebUrl(): string {
  if (process.env.WXT_WEB_URL) return process.env.WXT_WEB_URL;
  try {
    const env = readFileSync(new URL(".env", import.meta.url), "utf8");
    const match = env.match(/^WXT_WEB_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // .env 不存在时使用默认值
  }
  return "http://localhost:3000";
}

const webOrigins = Array.from(
  new Set([new URL(readWebUrl()).origin + "/*", "http://localhost:3000/*"])
);

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Pocket 收藏",
    description: "一键收藏当前页面到 Pocket",
    permissions: [
      "activeTab",
      "scripting",
      "storage",
      "contextMenus",
      "notifications",
    ],
    host_permissions: ["<all_urls>"],
    commands: {
      "save-page": {
        suggested_key: {
          default: "Ctrl+Shift+S",
          mac: "Command+Shift+S",
        },
        description: "收藏当前页面",
      },
    },
    // 允许网页授权页向插件发送登录 token
    externally_connectable: {
      matches: webOrigins,
    },
  },
});
