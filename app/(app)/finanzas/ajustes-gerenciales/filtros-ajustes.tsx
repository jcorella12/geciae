"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  ETIQUETA_ESTADO_AJUSTE,
  ETIQUETA_TIPO_AJUSTE,
  type EstadoAjusteGerencial,
  type TipoAjusteGerencial,
} from "@/lib/ajustes-gerenciales/state";

const TIPOS = Object.keys(ETIQUETA_TIPO_AJUSTE) as TipoAjusteGerencial[];
const ESTADOS = Object.keys(ETIQUETA_ESTADO_AJUSTE).filter(
  (e) => e !== "cancelado",
) as EstadoAjusteGerencial[];

export function FiltrosAjustes({
  filtrosActuales,
}: {
  filtrosActuales: { tipo?: string; estado?: string; empresa_id?: string };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(k: string, v: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-[12px]">
      <span className="text-ink-3">Filtros:</span>

      <select
        className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px]"
        value={filtrosActuales.tipo ?? ""}
        onChange={(e) => update("tipo", e.target.value || undefined)}
      >
        <option value="">Todos los tipos</option>
        {TIPOS.map((t) => (
          <option key={t} value={t}>
            {ETIQUETA_TIPO_AJUSTE[t]}
          </option>
        ))}
      </select>

      <select
        className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px]"
        value={filtrosActuales.estado ?? ""}
        onChange={(e) => update("estado", e.target.value || undefined)}
      >
        <option value="">Todos los estados</option>
        {ESTADOS.map((e) => (
          <option key={e} value={e}>
            {ETIQUETA_ESTADO_AJUSTE[e]}
          </option>
        ))}
      </select>

      {(filtrosActuales.tipo || filtrosActuales.estado || filtrosActuales.empresa_id) && (
        <button
          type="button"
          onClick={() => router.push("?")}
          className="text-[11.5px] text-ink-3 hover:text-ink-1"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
