"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { setTheme } from "@/app/(app)/theme-actions";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const THEME_COOKIE = "pse_theme";

function getCookieTheme(): Theme {
  if (typeof document === "undefined") return "system";
  const m = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${THEME_COOKIE}=`));
  if (!m) return "system";
  const v = m.split("=")[1] as Theme;
  if (v === "dark" || v === "light" || v === "system") return v;
  return "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  if (dark) {
    root.setAttribute("data-theme", "dark");
    root.classList.add("dark");
  } else {
    root.removeAttribute("data-theme");
    root.classList.remove("dark");
  }
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setLocalTheme] = useState<Theme>("system");

  useEffect(() => {
    const t = getCookieTheme();
    setLocalTheme(t);
    applyTheme(t);
    // Reaccionar a cambios de prefers-color-scheme cuando theme=system
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getCookieTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const onSelect = (next: Theme) => {
    setLocalTheme(next);
    applyTheme(next);
    void setTheme(next);
  };

  const opts: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Oscuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  if (compact) {
    // Botón único que rota entre los 3 modos
    const idx = opts.findIndex((o) => o.value === theme);
    const next = opts[(idx + 1) % opts.length];
    const Icon = opts[idx >= 0 ? idx : 0].icon;
    return (
      <button
        type="button"
        onClick={() => onSelect(next.value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-2 hover:bg-bg-2 hover:text-ink-1"
        aria-label={`Tema: ${theme}, click para cambiar a ${next.label}`}
        title={`Tema: ${theme}, click → ${next.label}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
      {opts.map((o) => {
        const Icon = o.icon;
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[12px] font-medium transition",
              active
                ? "bg-bg-2 text-ink-1"
                : "text-ink-3 hover:text-ink-1",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
