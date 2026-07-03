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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);
  const [mode, setModeState] = useState<ColorMode>("light");
  const [ready, setReady] = useState(false);

  const apply = useCallback((id: string, m: ColorMode) => {
    applyTheme(id, m);
  }, []);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME_ID;
    const storedMode = (localStorage.getItem(MODE_STORAGE_KEY) as ColorMode) ?? "light";
    setThemeIdState(storedTheme);
    setModeState(storedMode);
    apply(storedTheme, storedMode);
    setReady(true);
  }, [apply]);

  useEffect(() => {
    if (!ready || mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply(themeId, "system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [ready, themeId, mode, apply]);

  function setThemeId(id: string) {
    setThemeIdState(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
    apply(id, mode);
  }

  function setMode(m: ColorMode) {
    setModeState(m);
    localStorage.setItem(MODE_STORAGE_KEY, m);
    apply(themeId, m);
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
