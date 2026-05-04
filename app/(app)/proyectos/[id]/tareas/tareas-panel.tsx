"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { GanttView } from "./gantt-view";
import { KanbanView } from "./kanban-view";
import { ListaView } from "./lista-view";
import { NuevaTareaForm } from "./nueva-tarea-form";

export type TareaRow = {
  id: string;
  proyecto_id: string;
  parent_id: string | null;
  orden: number | null;
  titulo: string;
  descripcion: string | null;
  es_hito: boolean | null;
  estado:
    | "pendiente"
    | "en_curso"
    | "bloqueada"
    | "completada"
    | "cancelada";
  prioridad: "baja" | "media" | "alta" | "urgente" | null;
  fecha_inicio_planeada: string | null;
  fecha_fin_planeada: string | null;
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;
  duracion_dias: number | null;
  porcentaje_avance: number | null;
  asignado_a: string | null;
  horas_estimadas: number | null;
  horas_reales: number | null;
  costo_estimado: number | null;
  costo_real: number | null;
};

type View = "lista" | "kanban" | "gantt";

const VIEWS: { key: View; label: string }[] = [
  { key: "lista", label: "Lista" },
  { key: "kanban", label: "Kanban" },
  { key: "gantt", label: "Gantt" },
];

export function TareasPanel({
  proyectoId,
  tareas,
  puedeEditar,
}: {
  proyectoId: string;
  tareas: TareaRow[];
  puedeEditar: boolean;
}) {
  const [view, setView] = useState<View>("lista");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                "rounded-sm px-3 py-1 text-[12.5px] font-medium transition",
                view === v.key
                  ? "bg-bg-2 text-ink-1"
                  : "text-ink-3 hover:text-ink-1",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        {puedeEditar && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium hover:bg-bg-2"
          >
            {showForm ? "Cancelar" : "+ Nueva tarea"}
          </button>
        )}
      </div>

      {showForm && (
        <NuevaTareaForm
          proyectoId={proyectoId}
          onCreated={() => setShowForm(false)}
        />
      )}

      {tareas.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Sin tareas registradas. Crea la primera para empezar a planear.
        </p>
      ) : view === "lista" ? (
        <ListaView
          proyectoId={proyectoId}
          tareas={tareas}
          puedeEditar={puedeEditar}
        />
      ) : view === "kanban" ? (
        <KanbanView
          proyectoId={proyectoId}
          tareas={tareas}
          puedeEditar={puedeEditar}
        />
      ) : (
        <GanttView tareas={tareas} />
      )}
    </div>
  );
}
