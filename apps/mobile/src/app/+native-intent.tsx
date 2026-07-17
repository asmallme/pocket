import { getShareExtensionKey } from "expo-share-intent";

/**
 * 系统分享面板拉起 App 时，原生传入的是 dataUrl=... 形式的特殊路径，
 * expo-router 匹配不到会闪现 Unmatched Route 错误页。
 * 这里把它改写到首页，真正的跳转由 _layout 里的 ShareIntentHandler 完成。
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      return "/";
    }
    return path;
  } catch {
    return "/";
  }
}
