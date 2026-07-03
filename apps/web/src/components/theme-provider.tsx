"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  applyTheme,
  DEFAULT_THEME_ID,
  MODE_STORAGE_KEY,
  type ColorMode,
  THEME_STORAGE_KEY,
} from "@/lib/themes";

interface ThemeContextValue {
  themeId: string;
  mode: ColorMode;
  setThemeId: (id: string) => void;
  setMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isColorMode(value: string | null): value is ColorMode {
  return value === "light" || value === "dark" || value === "system";
}

function getStoredThemeId() {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  return localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME_ID;
}

function getStoredMode(): ColorMode {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  return isColorMode(stored) ? stored : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState(getStoredThemeId);
  const [mode, setModeState] = useState<ColorMode>(getStoredMode);

  const apply = useCallback((id: string, m: ColorMode) => {
    applyTheme(id, m);
  }, []);

  useEffect(() => {
    apply(themeId, mode);
  }, [themeId, mode, apply]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply(themeId, "system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themeId, mode, apply]);

  function setThemeId(id: string) {
    setThemeIdState(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  }

  function setMode(m: ColorMode) {
    setModeState(m);
    localStorage.setItem(MODE_STORAGE_KEY, m);
  }

  return (
    <ThemeContext.Provider value={{ themeId, mode, setThemeId, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
