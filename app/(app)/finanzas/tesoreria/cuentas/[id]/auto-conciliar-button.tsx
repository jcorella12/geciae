"use client";

import { Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { autoConciliarMes } from "./actions";

/**
 * Botón "Auto-conciliar mes" — ejecuta sugerir_match_movimiento sobre todos
 * los movs no conciliados del mes y los matchea con CFDIs/OCs si la similitud
 * supera el umbral configurable.
 *
 * No usa Claude — usa la RPC SQL existente (basada en monto/fecha/RFC).
 */
export function AutoConciliarButton({
  cuentaId,
  mesYYYYMM,
  movsPendientes,
}: {
  cuentaId: string;
  mesYYYYMM: string;
  movsPendientes: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [umbral, setUmbral] = useState(85);
  const [resultado, setResultado] = useState<{
    procesados: number;
    conciliados: number;
    sin_match: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (movsPendientes === 0) return null;

  function handleClick() {
    setError(null);
    setResultado(null);
    startTransition(async () => {
      const r = await autoConciliarMes(cuentaId, mesYYYYMM, umbral / 100);
      if (r.ok) {
        setResultado({
          procesados: r.procesados,
          conciliados: r.conciliados,
          sin_match: r.sin_match,
        });
        router.refresh();
      } else {
        setError(r.error ?? "Error al auto-conciliar");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-violet-200 bg-violet-50/50 px-3 py-2">
      <Wand2 className="h-4 w-4 text-violet-700" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-violet-900">
          Auto-conciliar {movsPendientes} mov pendientes con CFDIs/OCs
        </p>
        <p className="text-[10.5px] text-violet-700">
          Match por monto + fecha + RFC. Sólo matchea si confianza ≥{" "}
          <strong>{umbral}%</strong>.
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-violet-700">Umbral</span>
        <input
          type="range"
          min={70}
          max={99}
          step={1}
          value={umbral}
          onChange={(e) => setUmbral(parseInt(e.target.value))}
          disabled={isPending}
          className="w-24"
        />
        <span className="font-mono text-[11px] text-violet-900 w-8">
          {umbral}%
        </span>
      </div>

      <Button
        type="button"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="bg-violet-600 hover:bg-violet-700"
      >
        <Wand2 className="h-3 w-3" />
        {isPending ? "Procesando…" : "Auto-conciliar"}
      </Button>

      {resultado && (
        <div className="basis-full text-[11px]">
          <span className="text-emerald-700">
            ✓ {resultado.conciliados} conciliados
          </span>
          {resultado.sin_match > 0 && (
            <span className="ml-3 text-amber-700">
              ⚠ {resultado.sin_match} sin match (revisar manual)
            </span>
          )}
          <span className="ml-3 text-ink-3">
            de {resultado.procesados} procesados
          </span>
        </div>
      )}

      {error && (
        <div className="basis-full text-[11px] text-destructive">{error}</div>
      )}
    </div>
  );
}
