import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Pocket 收藏",
    description: "一键收藏当前页面到 Pocket",
    permissions: ["activeTab", "scripting", "storage"],
    host_permissions: ["<all_urls>"],
  },
});
