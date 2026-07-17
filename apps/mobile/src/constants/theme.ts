import { Platform } from "react-native";

/** 网兜品牌配色，与 apps/web globals.css 逐值对齐（oklch 精确换算为 sRGB hex）。 */
export const Palette = {
  light: {
    background: "#FCFAF6",
    card: "#FFFEFB",
    foreground: "#221812",
    primary: "#382315",
    primaryForeground: "#FAF8F4",
    muted: "#F3F0EA",
    mutedForeground: "#72665E",
    accent: "#F7E9D6",
    accentStrong: "#B8894A",
    border: "#E2DED5",
    destructive: "#DC2626",
    /* 亮色靠阴影分层，卡片不描边 */
    cardBorder: "rgba(0,0,0,0)",
    like: "#E0245E",
  },
  dark: {
    background: "#150E09",
    card: "#221912",
    foreground: "#EBE7E0",
    primary: "#E1D6C2",
    primaryForeground: "#1D140D",
    muted: "#2C221B",
    mutedForeground: "#978E82",
    accent: "#3A2A1F",
    accentStrong: "#D9A868",
    border: "#3B3029",
    destructive: "#FF6467",
    /* 暗色阴影不可见，卡片用暗描边分层 */
    cardBorder: "#32281F",
    like: "#FF5C8A",
  },
} as const;

export type ThemeColors = { [K in keyof (typeof Palette)["light"]]: string };

/** 旧版单值圆角，仍被少量次级页面引用 */
export const Radius = 12;

/** 圆角尺度：chip < 输入框 < 卡片 < 大容器 */
export const R = { sm: 10, md: 14, lg: 18, xl: 26 } as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** 品牌衬线：iOS 内置宋体，用在字标与摘句，呼应「纸上剪报」的质感 */
export const SerifFont = Platform.select({ ios: "Songti SC", default: "serif" });

/** 卡片投影（iOS）；暗色下几乎不可见，由 cardBorder 兜底分层 */
export const CardShadow = {
  shadowColor: "#2A1B10",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
} as const;

/** 悬浮 Dock 的占位高度（列表底部留白用） */
export const DOCK_SPACE = 108;
