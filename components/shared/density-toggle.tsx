"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "pse_density";
type Density = "comfy" | "compact";

/**
 * Toggle de densidad persistente en localStorage.
 * Setea `data-density` en `<html>` — los tokens de spacing y row-h responden.
 */
export function DensityToggle({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "menu";
  className?: string;
}) {
  const [density, setDensity] = useState<Density>("comfy");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "compact" || stored === "comfy") {
        setDensity(stored);
        document.documentElement.setAttribute("data-density", stored);
      }
    } catch {
      // localStorage no disponible — silencioso
    }
  }, []);

  function update(next: Density) {
    setDensity(next);
    document.documentElement.setAttribute("data-density", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  if (!mounted) return null;

  if (variant === "menu") {
    return (
      <div
        className={cn(
          "flex items-center gap-1 rounded-md border border-border bg-bg-1 p-0.5",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => update("comfy")}
          className={cn(
            "flex items-center gap-1.5 rounded px-2 py-1 text-[12px] transition",
            density === "comfy"
              ? "bg-brand text-brand-fg"
              : "text-ink-3 hover:text-ink-1",
          )}
        >
          <Maximize2 className="h-3 w-3" />
          Cómoda
        </button>
        <button
          type="button"
          onClick={() => update("compact")}
          className={cn(
            "flex items-center gap-1.5 rounded px-2 py-1 text-[12px] transition",
            density === "compact"
              ? "bg-brand text-brand-fg"
              : "text-ink-3 hover:text-ink-1",
          )}
        >
          <Minimize2 className="h-3 w-3" />
          Compacta
        </button>
      </div>
    );
  }

  // variant icon
  const next: Density = density === "comfy" ? "compact" : "comfy";
  const Icon = density === "comfy" ? Minimize2 : Maximize2;
  const tooltip =
    density === "comfy" ? "Cambiar a densidad compacta" : "Cambiar a densidad cómoda";
  return (
    <button
      type="button"
      onClick={() => update(next)}
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition hover:bg-bg-2 hover:text-ink-1",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
