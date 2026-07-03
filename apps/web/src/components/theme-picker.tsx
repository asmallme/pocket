"use client";

import { appThemes } from "@/lib/themes";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const { themeId, mode, setThemeId, setMode } = useTheme();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {appThemes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => setThemeId(theme.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              themeId === theme.id
                ? "border-primary bg-accent ring-1 ring-primary/20"
                : "border-border hover:bg-muted/50"
            )}
          >
            <div className="mb-2 flex gap-1">
              {(["--primary", "--quote", "--background", "--ai"] as const).map(
                (key) => (
                  <span
                    key={key}
                    className="size-4 rounded-full border border-border/50"
                    style={{
                      background: theme.light[key],
                    }}
                  />
                )
              )}
            </div>
            <p className="text-sm font-medium">{theme.name}</p>
            <p className="text-xs text-muted-foreground">{theme.tagline}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {(
          [
            { id: "light", label: "浅色" },
            { id: "dark", label: "深色" },
            { id: "system", label: "跟随系统" },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "flex-1 rounded-full border py-1.5 text-xs font-medium transition-colors",
              mode === m.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
