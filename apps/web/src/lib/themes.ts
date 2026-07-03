export interface AppTheme {
  id: string;
  name: string;
  tagline: string;
  fontQuote: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export const DEFAULT_THEME_ID = "paper";

export const appThemes: AppTheme[] = [
  {
    id: "paper",
    name: "纸墨",
    tagline: "编辑部气质 · 温暖克制",
    fontQuote: 'Georgia, "Songti SC", "Noto Serif SC", serif',
    light: {
      "--background": "oklch(0.985 0.006 85)",
      "--foreground": "oklch(0.22 0.02 55)",
      "--card": "oklch(0.995 0.004 90)",
      "--card-foreground": "oklch(0.22 0.02 55)",
      "--primary": "oklch(0.28 0.04 55)",
      "--primary-foreground": "oklch(0.98 0.006 90)",
      "--secondary": "oklch(0.96 0.01 85)",
      "--secondary-foreground": "oklch(0.32 0.03 55)",
      "--muted": "oklch(0.955 0.008 85)",
      "--muted-foreground": "oklch(0.52 0.02 55)",
      "--accent": "oklch(0.94 0.03 75)",
      "--accent-foreground": "oklch(0.35 0.06 55)",
      "--border": "oklch(0.9 0.012 85)",
      "--input": "oklch(0.9 0.012 85)",
      "--ring": "oklch(0.55 0.06 55)",
      "--quote": "oklch(0.55 0.1 55)",
      "--quote-bg": "oklch(0.97 0.02 80)",
      "--ai": "oklch(0.48 0.06 55)",
      "--radius": "0.5rem",
    },
    dark: {
      "--background": "oklch(0.17 0.015 55)",
      "--foreground": "oklch(0.93 0.01 85)",
      "--card": "oklch(0.21 0.018 55)",
      "--card-foreground": "oklch(0.93 0.01 85)",
      "--primary": "oklch(0.88 0.03 85)",
      "--primary-foreground": "oklch(0.2 0.02 55)",
      "--secondary": "oklch(0.26 0.02 55)",
      "--secondary-foreground": "oklch(0.9 0.01 85)",
      "--muted": "oklch(0.26 0.02 55)",
      "--muted-foreground": "oklch(0.65 0.02 75)",
      "--accent": "oklch(0.3 0.03 55)",
      "--accent-foreground": "oklch(0.92 0.02 85)",
      "--border": "oklch(0.32 0.02 55)",
      "--input": "oklch(0.32 0.02 55)",
      "--ring": "oklch(0.65 0.05 75)",
      "--quote": "oklch(0.72 0.08 75)",
      "--quote-bg": "oklch(0.24 0.025 55)",
      "--ai": "oklch(0.7 0.05 75)",
      "--radius": "0.5rem",
    },
  },
  {
    id: "mist",
    name: "晨雾",
    tagline: "冷静极简 · 信息清晰",
    fontQuote: 'var(--font-geist-sans), "PingFang SC", sans-serif',
    light: {
      "--background": "oklch(0.985 0.004 250)",
      "--foreground": "oklch(0.25 0.02 250)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.25 0.02 250)",
      "--primary": "oklch(0.48 0.1 250)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--secondary": "oklch(0.96 0.01 250)",
      "--secondary-foreground": "oklch(0.35 0.05 250)",
      "--muted": "oklch(0.96 0.008 250)",
      "--muted-foreground": "oklch(0.55 0.02 250)",
      "--accent": "oklch(0.94 0.02 250)",
      "--accent-foreground": "oklch(0.4 0.08 250)",
      "--border": "oklch(0.91 0.01 250)",
      "--input": "oklch(0.91 0.01 250)",
      "--ring": "oklch(0.48 0.1 250)",
      "--quote": "oklch(0.48 0.1 250)",
      "--quote-bg": "oklch(0.97 0.015 250)",
      "--ai": "oklch(0.5 0.08 250)",
      "--radius": "0.75rem",
    },
    dark: {
      "--background": "oklch(0.16 0.02 250)",
      "--foreground": "oklch(0.94 0.01 250)",
      "--card": "oklch(0.2 0.025 250)",
      "--card-foreground": "oklch(0.94 0.01 250)",
      "--primary": "oklch(0.68 0.12 250)",
      "--primary-foreground": "oklch(0.16 0.02 250)",
      "--secondary": "oklch(0.25 0.025 250)",
      "--secondary-foreground": "oklch(0.9 0.01 250)",
      "--muted": "oklch(0.25 0.025 250)",
      "--muted-foreground": "oklch(0.65 0.02 250)",
      "--accent": "oklch(0.28 0.04 250)",
      "--accent-foreground": "oklch(0.92 0.01 250)",
      "--border": "oklch(0.3 0.02 250)",
      "--input": "oklch(0.3 0.02 250)",
      "--ring": "oklch(0.68 0.12 250)",
      "--quote": "oklch(0.7 0.1 250)",
      "--quote-bg": "oklch(0.22 0.03 250)",
      "--ai": "oklch(0.68 0.08 250)",
      "--radius": "0.75rem",
    },
  },
  {
    id: "night",
    name: "静夜",
    tagline: "深夜阅读 · 低刺激",
    fontQuote: 'Georgia, "Songti SC", serif',
    light: {
      "--background": "oklch(0.97 0.008 280)",
      "--foreground": "oklch(0.22 0.02 280)",
      "--card": "oklch(0.99 0.004 280)",
      "--card-foreground": "oklch(0.22 0.02 280)",
      "--primary": "oklch(0.32 0.04 280)",
      "--primary-foreground": "oklch(0.97 0.008 280)",
      "--secondary": "oklch(0.94 0.01 280)",
      "--secondary-foreground": "oklch(0.3 0.03 280)",
      "--muted": "oklch(0.94 0.01 280)",
      "--muted-foreground": "oklch(0.5 0.02 280)",
      "--accent": "oklch(0.92 0.015 280)",
      "--accent-foreground": "oklch(0.32 0.04 280)",
      "--border": "oklch(0.88 0.012 280)",
      "--input": "oklch(0.88 0.012 280)",
      "--ring": "oklch(0.45 0.04 280)",
      "--quote": "oklch(0.55 0.06 85)",
      "--quote-bg": "oklch(0.95 0.015 280)",
      "--ai": "oklch(0.55 0.05 85)",
      "--radius": "0.625rem",
    },
    dark: {
      "--background": "oklch(0.14 0.012 280)",
      "--foreground": "oklch(0.9 0.012 85)",
      "--card": "oklch(0.18 0.014 280)",
      "--card-foreground": "oklch(0.9 0.012 85)",
      "--primary": "oklch(0.85 0.04 85)",
      "--primary-foreground": "oklch(0.16 0.012 280)",
      "--secondary": "oklch(0.22 0.015 280)",
      "--secondary-foreground": "oklch(0.88 0.012 85)",
      "--muted": "oklch(0.22 0.015 280)",
      "--muted-foreground": "oklch(0.62 0.02 85)",
      "--accent": "oklch(0.24 0.02 280)",
      "--accent-foreground": "oklch(0.88 0.02 85)",
      "--border": "oklch(0.26 0.015 280)",
      "--input": "oklch(0.26 0.015 280)",
      "--ring": "oklch(0.7 0.04 85)",
      "--quote": "oklch(0.75 0.06 85)",
      "--quote-bg": "oklch(0.2 0.018 280)",
      "--ai": "oklch(0.68 0.05 85)",
      "--radius": "0.625rem",
    },
  },
  {
    id: "garden",
    name: "苔绿",
    tagline: "知识花园 · 温润耐久",
    fontQuote: '"Iowan Old Style", "Songti SC", Georgia, serif',
    light: {
      "--background": "oklch(0.98 0.012 130)",
      "--foreground": "oklch(0.24 0.03 150)",
      "--card": "oklch(0.995 0.008 130)",
      "--card-foreground": "oklch(0.24 0.03 150)",
      "--primary": "oklch(0.42 0.08 150)",
      "--primary-foreground": "oklch(0.98 0.01 130)",
      "--secondary": "oklch(0.95 0.02 130)",
      "--secondary-foreground": "oklch(0.35 0.06 150)",
      "--muted": "oklch(0.95 0.015 130)",
      "--muted-foreground": "oklch(0.5 0.03 150)",
      "--accent": "oklch(0.93 0.03 130)",
      "--accent-foreground": "oklch(0.38 0.07 150)",
      "--border": "oklch(0.9 0.02 130)",
      "--input": "oklch(0.9 0.02 130)",
      "--ring": "oklch(0.42 0.08 150)",
      "--quote": "oklch(0.45 0.09 150)",
      "--quote-bg": "oklch(0.96 0.025 130)",
      "--ai": "oklch(0.48 0.07 150)",
      "--radius": "0.875rem",
    },
    dark: {
      "--background": "oklch(0.16 0.02 150)",
      "--foreground": "oklch(0.92 0.015 130)",
      "--card": "oklch(0.2 0.025 150)",
      "--card-foreground": "oklch(0.92 0.015 130)",
      "--primary": "oklch(0.72 0.1 150)",
      "--primary-foreground": "oklch(0.16 0.02 150)",
      "--secondary": "oklch(0.24 0.025 150)",
      "--secondary-foreground": "oklch(0.9 0.015 130)",
      "--muted": "oklch(0.24 0.025 150)",
      "--muted-foreground": "oklch(0.65 0.03 130)",
      "--accent": "oklch(0.28 0.04 150)",
      "--accent-foreground": "oklch(0.9 0.02 130)",
      "--border": "oklch(0.3 0.025 150)",
      "--input": "oklch(0.3 0.025 150)",
      "--ring": "oklch(0.72 0.1 150)",
      "--quote": "oklch(0.72 0.09 150)",
      "--quote-bg": "oklch(0.22 0.03 150)",
      "--ai": "oklch(0.68 0.07 150)",
      "--radius": "0.875rem",
    },
  },
];

export type ColorMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "pocket-theme";
export const MODE_STORAGE_KEY = "pocket-mode";

export function getTheme(id: string): AppTheme {
  return appThemes.find((t) => t.id === id) ?? appThemes[0];
}

export function resolveMode(mode: ColorMode): "light" | "dark" {
  if (mode === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode === "dark" ? "dark" : "light";
}

export function applyTheme(themeId: string, mode: ColorMode) {
  if (typeof document === "undefined") return;
  const theme = getTheme(themeId);
  const resolved = resolveMode(mode);
  const vars = resolved === "dark" ? theme.dark : theme.light;
  const root = document.documentElement;

  root.setAttribute("data-theme", themeId);
  root.classList.toggle("dark", resolved === "dark");
  root.style.setProperty("--font-quote", theme.fontQuote);

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  root.style.setProperty("--popover", vars["--card"]);
  root.style.setProperty("--popover-foreground", vars["--card-foreground"]);
}

/** 内联脚本：首屏防闪烁 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"${DEFAULT_THEME_ID}";var m=localStorage.getItem("${MODE_STORAGE_KEY}")||"light";var d=m==="dark"||(m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",t);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
