"use client";

import { Search } from "lucide-react";

import { usePeek } from "@/components/shared/peek-provider";

/**
 * S3-T1 — Trigger compacto del cmdk global del PeekProvider.
 *
 * Reemplaza `<GlobalSearch />` (que duplicaba el handler ⌘K y vivía
 * separado del PeekProvider). Ahora ⌘K, este botón y el botón "Buscar"
 * del BottomNav móvil disparan el MISMO cmdk del PeekProvider — sin
 * race conditions ni duplicación de UI.
 */
export function SearchTrigger() {
  const { openCmdk } = usePeek();

  return (
    <button
      type="button"
      onClick={openCmdk}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-bg-2 px-3 text-[12.5px] text-ink-3 transition hover:bg-secondary hover:text-foreground"
      aria-label="Búsqueda global"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden md:inline">Buscar…</span>
      <kbd className="hidden md:inline rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}
