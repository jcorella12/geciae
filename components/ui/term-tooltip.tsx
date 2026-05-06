"use client";

import { useState } from "react";

import { obtenerTermino } from "@/lib/glosario/terminos";
import { cn } from "@/lib/utils";

/**
 * Renderiza un término con tooltip explicativo si está en el glosario.
 * Si no está, lo muestra normal.
 */
export function TermTooltip({
  term,
  className,
}: {
  term: string;
  className?: string;
}) {
  const info = obtenerTermino(term);
  const [open, setOpen] = useState(false);
  if (!info) return <span className={className}>{term}</span>;
  return (
    <span className="relative inline-block">
      <span
        className={cn("cursor-help underline decoration-dotted underline-offset-2", className)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
      >
        {term}
      </span>
      {open && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-md border border-border bg-card p-3 shadow-lg">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            {term}
          </span>
          <span className="mt-1 block text-[12.5px] text-ink-1">
            {info.definicion}
          </span>
          {info.ejemplo && (
            <span className="mt-1 block text-[11.5px] italic text-ink-3">
              Ejemplo: {info.ejemplo}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
