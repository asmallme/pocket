/** 网兜品牌配色，取自 apps/web globals.css（oklch 换算为 hex 近似值）。 */
export const Palette = {
  light: {
    background: "#FAF8F4",
    card: "#FEFDFA",
    foreground: "#2B241D",
    primary: "#453729",
    primaryForeground: "#FAF7F0",
    muted: "#F1EEE7",
    mutedForeground: "#766B5F",
    accent: "#F0E5D2",
    border: "#E2DED3",
    destructive: "#B3261E",
  },
  dark: {
    background: "#211C16",
    card: "#2A241D",
    foreground: "#ECE8E0",
    primary: "#E0D6C0",
    primaryForeground: "#2B241D",
    muted: "#362E25",
    mutedForeground: "#9C9184",
    accent: "#3E352A",
    border: "#3A332A",
    destructive: "#F2B8B5",
  },
} as const;

export type ThemeColors = { [K in keyof (typeof Palette)["light"]]: string };

export const Radius = 8;
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;
