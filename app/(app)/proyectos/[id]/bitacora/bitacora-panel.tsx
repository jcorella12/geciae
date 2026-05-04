"use client";

import { AlertTriangle, Eye, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import {
  COLOR_TIPO_BITACORA,
  ETIQUETA_TIPO_BITACORA,
  ICONO_TIPO_BITACORA,
  type TipoEventoBitacora,
} from "@/lib/proyecto-extras/state";

import { eliminarEventoBitacora } from "./actions";
import { BitacoraForm } from "./bitacora-form";

type Evento = {
  id: string;
  fecha: string;
  tipo: TipoEventoBitacora;
  titulo: string | null;
  descripcion: string;
  tarea_id: string | null;
  tarea_titulo: string | null;
  es_critica: boolean | null;
  visible_cliente: boolean | null;
  capturado_por_nombre: string | null;
};

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function BitacoraPanel({
  proyectoId,
  eventos,
  puedeEditar,
}: {
  proyectoId: string;
  eventos: Evento[];
  puedeEditar: boolean;
}) {
  const [, startTransition] = useTransition();
  const [filtro, setFiltro] = useState<TipoEventoBitacora | "todos">("todos");
  const [showForm, setShowForm] = useState(false);

  const filtrados =
    filtro === "todos" ? eventos : eventos.filter((e) => e.tipo === filtro);

  const onEliminar = (id: string) => {
    if (!confirm("¿Eliminar este evento? No se puede deshacer.")) return;
    startTransition(() => {
      eliminarEventoBitacora(id, proyectoId);
    });
  };

  const tipos = Object.keys(ETIQUETA_TIPO_BITACORA) as TipoEventoBitacora[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFiltro("todos")}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              filtro === "todos"
                ? "bg-ink-1 text-bg-1"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3"
            }`}
          >
            Todos ({eventos.length})
          </button>
          {tipos.map((t) => {
            const n = eventos.filter((e) => e.tipo === t).length;
            if (n === 0) return null;
            return (
              <button
                key={t}
                onClick={() => setFiltro(t)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  filtro === t
                    ? "bg-ink-1 text-bg-1"
                    : `${COLOR_TIPO_BITACORA[t]} hover:opacity-80`
                }`}
              >
                {ICONO_TIPO_BITACORA[t]} {ETIQUETA_TIPO_BITACORA[t]} ({n})
              </button>
            );
          })}
        </div>
        {puedeEditar && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium hover:bg-bg-2"
          >
            {showForm ? "Cancelar" : "+ Nuevo evento"}
          </button>
        )}
      </div>

      {showForm && <BitacoraForm proyectoId={proyectoId} />}

      {filtrados.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          {eventos.length === 0
            ? "Sin eventos registrados. Captura el primer evento para empezar la bitácora."
            : "No hay eventos con ese filtro."}
        </p>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-divider pl-6">
          {filtrados.map((e) => (
            <li key={e.id} className="relative">
              <span
                className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-bg-1 ${COLOR_TIPO_BITACORA[e.tipo]}`}
              >
                <span className="text-[11px]">
                  {ICONO_TIPO_BITACORA[e.tipo]}
                </span>
              </span>
              <article
                className={`rounded-md border p-3.5 shadow-xs ${
                  e.es_critica
                    ? "border-danger/40 bg-danger-soft/30"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_TIPO_BITACORA[e.tipo]}`}
                      >
                        {ETIQUETA_TIPO_BITACORA[e.tipo]}
                      </span>
                      {e.es_critica && (
                        <span className="flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                          <AlertTriangle className="h-3 w-3" />
                          Crítico
                        </span>
                      )}
                      {e.visible_cliente && (
                        <span className="flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-medium text-info-deep">
                          <Eye className="h-3 w-3" />
                          Visible cliente
                        </span>
                      )}
                      <span className="text-[10.5px] text-ink-3">
                        {fmtFecha(e.fecha)}
                      </span>
                    </div>
                    {e.titulo && (
                      <h4 className="mt-1.5 text-[13.5px] font-semibold leading-tight">
                        {e.titulo}
                      </h4>
                    )}
                    <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2">
                      {e.descripcion}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10.5px] text-ink-3">
                      {e.capturado_por_nombre && (
                        <span>{e.capturado_por_nombre}</span>
                      )}
                      {e.tarea_titulo && (
                        <>
                          <span>·</span>
                          <span>📋 {e.tarea_titulo}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {puedeEditar && (
                    <button
                      onClick={() => onEliminar(e.id)}
                      className="text-ink-4 hover:text-destructive"
                      aria-label="Eliminar"
                      title="Eliminar evento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
