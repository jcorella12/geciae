"use client";

import { Diamond } from "lucide-react";
import { useState, useTransition } from "react";

import {
  COLOR_PRIORIDAD,
  ETIQUETA_PRIORIDAD,
  type EstadoTareaProyecto,
  type PrioridadTarea,
} from "@/lib/proyecto-tareas/state";
import { cn } from "@/lib/utils";

import { moverTareaEstado } from "./actions";
import type { TareaRow } from "./tareas-panel";

const COLUMNAS: {
  key: EstadoTareaProyecto;
  label: string;
  headerColor: string;
}[] = [
  { key: "pendiente", label: "Pendiente", headerColor: "bg-gray-50 border-gray-300" },
  { key: "en_curso", label: "En curso", headerColor: "bg-sky-50 border-sky-300" },
  { key: "bloqueada", label: "Bloqueada", headerColor: "bg-red-50 border-red-300" },
  { key: "completada", label: "Completada", headerColor: "bg-emerald-50 border-emerald-300" },
];

const fmtFecha = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
    : null;

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function KanbanView({
  proyectoId,
  tareas,
  puedeEditar,
}: {
  proyectoId: string;
  tareas: TareaRow[];
  puedeEditar: boolean;
}) {
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<string | null>(null);

  const tareasPorEstado: Record<string, TareaRow[]> = {
    pendiente: [],
    en_curso: [],
    bloqueada: [],
    completada: [],
  };
  for (const t of tareas) {
    if (t.estado === "cancelada") continue;
    if (tareasPorEstado[t.estado]) tareasPorEstado[t.estado].push(t);
  }

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (e: React.DragEvent, estado: string) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    startTransition(() => {
      moverTareaEstado(id, proyectoId, estado);
    });
  };

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {COLUMNAS.map((col) => {
        const cards = tareasPorEstado[col.key] ?? [];
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              if (puedeEditar) setDragOver(col.key);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => puedeEditar && onDrop(e, col.key)}
            className={cn(
              "rounded-md border bg-bg-2/40 p-2 transition",
              dragOver === col.key
                ? "border-brand bg-brand/5"
                : "border-divider",
            )}
          >
            <div
              className={`mb-2 flex items-center justify-between rounded-md border px-2.5 py-1.5 ${col.headerColor}`}
            >
              <h3 className="text-[12px] font-semibold">{col.label}</h3>
              <span className="font-mono text-[11px] text-ink-3">
                {cards.length}
              </span>
            </div>

            <div className="space-y-2 min-h-[60px]">
              {cards.map((t) => {
                const prioridad = (t.prioridad ?? "media") as PrioridadTarea;
                return (
                  <div
                    key={t.id}
                    draggable={puedeEditar}
                    onDragStart={(e) => onDragStart(e, t.id)}
                    className="rounded-md border border-border bg-card p-2.5 shadow-xs hover:shadow-sm cursor-grab"
                  >
                    <div className="flex items-start gap-1.5">
                      {t.es_hito && (
                        <Diamond className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-600" />
                      )}
                      <p className="text-[12.5px] font-medium leading-tight">
                        {t.titulo}
                      </p>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-1.5 py-px text-[10px] font-medium ${COLOR_PRIORIDAD[prioridad]}`}
                      >
                        {ETIQUETA_PRIORIDAD[prioridad]}
                      </span>
                      {t.fecha_fin_planeada && (
                        <span className="text-[10px] text-ink-3">
                          📅 {fmtFecha(t.fecha_fin_planeada)}
                        </span>
                      )}
                    </div>

                    {(t.porcentaje_avance ?? 0) > 0 && col.key !== "completada" && (
                      <div className="mt-1.5">
                        <div className="h-1 overflow-hidden rounded-full bg-bg-3">
                          <div
                            className="h-full bg-sky-400"
                            style={{ width: `${t.porcentaje_avance}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {t.costo_estimado != null && (
                      <p className="mt-1 font-mono text-[10px] text-ink-3 tnum">
                        {fmtMxn.format(Number(t.costo_estimado))}
                      </p>
                    )}
                  </div>
                );
              })}
              {cards.length === 0 && (
                <p className="text-center text-[10.5px] text-ink-4 py-4">
                  Sin tareas
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
