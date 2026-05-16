"use client";

import { RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * S4-T3 — Banner que aparece cuando `useFormDraft` recuperó un borrador.
 *
 * El form decide cuándo mostrarlo (típicamente al montar si `hasDraft`)
 * y maneja el "Restaurar" / "Descartar" via callbacks.
 */
export function DraftRecoveryBanner({
  onRestore,
  onDiscard,
  label,
}: {
  onRestore: () => void;
  onDiscard: () => void;
  label?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px]">
      <RotateCcw className="h-4 w-4 flex-shrink-0 text-amber-700" />
      <span className="flex-1 text-amber-900">
        {label ??
          "Tienes un borrador sin guardar de este formulario. ¿Lo restauras?"}
      </span>
      <Button size="sm" variant="outline" onClick={onRestore}>
        Restaurar
      </Button>
      <Button size="sm" variant="ghost" onClick={onDiscard}>
        <X className="h-3.5 w-3.5" />
        Descartar
      </Button>
    </div>
  );
}
