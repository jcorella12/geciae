"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  COLOR_ESTADO_OPORTUNIDAD,
  ETAPAS_PIPELINE,
  ETIQUETA_ESTADO_OPORTUNIDAD,
  type EstadoOportunidad,
} from "@/lib/oportunidades/state";
import { cn } from "@/lib/utils";

import { cambiarEtapa } from "./actions";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtMxnShort = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  notation: "compact",
  maximumFractionDigits: 1,
});

export type OportunidadKanban = {
  id: string;
  nombre: string;
  estado: EstadoOportunidad;
  monto_estimado: number | null;
  probabilidad: number | null;
  fecha_proxima_accion: string | null;
  proxima_accion: string | null;
  empresa_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  empresas: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clientes: any;
};

export function KanbanPipeline({
  oportunidades,
  puedeEditar,
}: {
  oportunidades: OportunidadKanban[];
  puedeEditar: boolean;
}) {
  const [items, setItems] = useState(oportunidades);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const porEtapa = new Map<EstadoOportunidad, OportunidadKanban[]>();
  for (const e of ETAPAS_PIPELINE) porEtapa.set(e, []);
  for (const o of items) {
    if (porEtapa.has(o.estado)) porEtapa.get(o.estado)!.push(o);
  }

  const onDragStart = (e: React.DragEvent, id: string) => {
    if (!puedeEditar) return;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (e: React.DragEvent, etapa: EstadoOportunidad) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const op = items.find((x) => x.id === id);
    if (!op || op.estado === etapa) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, estado: etapa } : x)),
    );

    startTransition(async () => {
      const result = await cambiarEtapa(id, etapa);
      if (!result.ok) {
        // Revertir
        setItems((prev) =>
          prev.map((x) => (x.id === id ? { ...x, estado: op.estado } : x)),
        );
        alert(result.error ?? "Error al mover");
      }
    });
  };

  return (
    <div className="overflow-x-auto pb-3">
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${ETAPAS_PIPELINE.length}, minmax(240px, 1fr))`,
        }}
      >
        {ETAPAS_PIPELINE.map((etapa) => {
          const lista = porEtapa.get(etapa) ?? [];
          const total = lista.reduce(
            (a, o) => a + Number(o.monto_estimado ?? 0),
            0,
          );
          return (
            <div
              key={etapa}
              onDragOver={(e) => {
                if (!puedeEditar) return;
                e.preventDefault();
                setDragOver(etapa);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => onDrop(e, etapa)}
              className={cn(
                "rounded-md p-3 transition",
                dragOver === etapa
                  ? "bg-brand-soft ring-2 ring-brand"
                  : "bg-bg-2",
              )}
              style={{ minHeight: "60vh" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_OPORTUNIDAD[etapa]}`}
                >
                  {ETIQUETA_ESTADO_OPORTUNIDAD[etapa]}
                </span>
                <span className="text-[11px] text-ink-3">
                  {lista.length} · {fmtMxnShort.format(total)}
                </span>
              </div>
              <div className="space-y-2">
                {lista.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-card/50 p-4 text-center text-[11px] text-ink-4">
                    {puedeEditar
                      ? "Arrastra aquí para mover"
                      : "Sin oportunidades"}
                  </div>
                ) : (
                  lista.map((o) => {
                    const cli = o.clientes as
                      | { razon_social: string; nombre_comercial: string | null }
                      | null;
                    const emp = o.empresas as { codigo: string } | null;
                    return (
                      <div
                        key={o.id}
                        draggable={puedeEditar}
                        onDragStart={(e) => onDragStart(e, o.id)}
                        className={cn(
                          "block rounded-md border border-border bg-card p-3 shadow-xs transition hover:border-brand hover:shadow-sm",
                          puedeEditar ? "cursor-grab active:cursor-grabbing" : "",
                        )}
                      >
                        <Link href={`/comercial/oportunidades/${o.id}`}>
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium">
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full ${empresaCodigoColor[emp?.codigo ?? ""] ?? "bg-muted-foreground"}`}
                              />
                              {emp?.codigo ?? "?"}
                            </span>
                            {Number(o.probabilidad ?? 0) > 0 && (
                              <span className="font-mono text-[10px] text-ink-3">
                                {Math.round(Number(o.probabilidad ?? 0) * 100)}%
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-2 text-[12.5px] font-medium leading-tight">
                            {o.nombre}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-ink-3">
                            {cli?.nombre_comercial ??
                              cli?.razon_social ??
                              "Sin cliente"}
                          </p>
                          {o.monto_estimado &&
                            Number(o.monto_estimado) > 0 && (
                              <p className="mt-1.5 font-mono text-[12px] font-medium tnum">
                                {fmtMxnShort.format(Number(o.monto_estimado))}
                              </p>
                            )}
                          {o.fecha_proxima_accion && (
                            <p className="mt-1 text-[10px] text-amber-700">
                              ⏰{" "}
                              {new Date(
                                o.fecha_proxima_accion as string,
                              ).toLocaleDateString("es-MX", {
                                day: "numeric",
                                month: "short",
                              })}
                              {o.proxima_accion && ` · ${o.proxima_accion}`}
                            </p>
                          )}
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
