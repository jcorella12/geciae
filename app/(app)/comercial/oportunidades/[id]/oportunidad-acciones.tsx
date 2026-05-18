"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import {
  ETAPAS_PIPELINE,
  ETIQUETA_ESTADO_OPORTUNIDAD,
  type EstadoOportunidad,
} from "@/lib/oportunidades/state";

import {
  cambiarEtapa,
  cerrarOportunidadGanada,
  cerrarOportunidadPerdida,
} from "../actions";

export function OportunidadAcciones({
  oportunidadId,
  estado,
  puedeEditar,
}: {
  oportunidadId: string;
  estado: EstadoOportunidad;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!puedeEditar) return null;

  function avanzar(target: EstadoOportunidad) {
    setError(null);
    startTransition(async () => {
      const r = await cambiarEtapa(oportunidadId, target);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  async function ganar() {
    if (!(await confirm("¿Marcar esta oportunidad como GANADA?"))) return;
    setError(null);
    startTransition(async () => {
      const r = await cerrarOportunidadGanada(oportunidadId);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function perder() {
    const motivo = window.prompt("Motivo de pérdida (mín 3 caracteres):");
    if (!motivo || motivo.trim().length < 3) {
      if (motivo !== null) alert("Motivo requerido (mín 3 caracteres).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await cerrarOportunidadPerdida(oportunidadId, motivo);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  const idx = ETAPAS_PIPELINE.indexOf(estado);
  const siguiente =
    idx >= 0 && idx < ETAPAS_PIPELINE.length - 1
      ? ETAPAS_PIPELINE[idx + 1]
      : null;
  const anterior = idx > 0 ? ETAPAS_PIPELINE[idx - 1] : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {anterior && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => avanzar(anterior)}
            disabled={isPending}
          >
            ← {ETIQUETA_ESTADO_OPORTUNIDAD[anterior]}
          </Button>
        )}
        {siguiente && (
          <Button
            size="sm"
            onClick={() => avanzar(siguiente)}
            disabled={isPending}
          >
            {ETIQUETA_ESTADO_OPORTUNIDAD[siguiente]} →
          </Button>
        )}
        <span className="mx-2 text-ink-5">·</span>
        <Button
          size="sm"
          onClick={ganar}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          🏆 Marcar Ganada
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={perder}
          disabled={isPending}
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          ✕ Marcar Perdida
        </Button>
      </div>
      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}
    </div>
  );
}
