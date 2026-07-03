import { redirect } from "next/navigation";

export const metadata = {
  title: "iOS 快捷指令收藏",
  description: "使用 iOS 快捷指令从 Safari、X App 等应用一键收藏到 Pocket。",
};

/** 配置入口统一放在个人中心，保留此路径便于旧链接跳转。 */
export default function IosShortcutPage() {
  redirect("/settings?section=ios-shortcut");
}
