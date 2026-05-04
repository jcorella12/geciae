"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Sección colapsable de form. Por default cerrada para reducir ruido visual
 * y permitir captura express; abierta si hay datos pre-cargados.
 *
 * Usa `<details>` HTML nativo — sin estado React, sin animaciones complejas.
 */
export function CollapsibleSection({
  title,
  hint,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-lg border border-border bg-card shadow-sm [&_summary::-webkit-details-marker]:hidden",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}
