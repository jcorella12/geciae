"use client";

import { CheckCircle2, Circle, Diamond, Trash2 } from "lucide-react";
import { useTransition } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import {
  COLOR_ESTADO_TAREA,
  COLOR_PRIORIDAD,
  ETIQUETA_ESTADO_TAREA,
  ETIQUETA_PRIORIDAD,
  type EstadoTareaProyecto,
  type PrioridadTarea,
} from "@/lib/proyecto-tareas/state";

import {
  actualizarAvanceTarea,
  eliminarTarea,
  moverTareaEstado,
} from "./actions";
import { AdjuntarTareaForm } from "./adjuntar-tarea-form";
import type { TareaRow } from "./tareas-panel";

const fmtFecha = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
      })
    : "—";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function ListaView({
  proyectoId,
  tareas,
  puedeEditar,
}: {
  proyectoId: string;
  tareas: TareaRow[];
  puedeEditar: boolean;
}) {
  const [, startTransition] = useTransition();

  const onChangeEstado = (tareaId: string, nuevo: string) => {
    startTransition(() => {
      moverTareaEstado(tareaId, proyectoId, nuevo);
    });
  };

  const onChangeAvance = (tareaId: string, valor: number) => {
    startTransition(() => {
      actualizarAvanceTarea(tareaId, proyectoId, valor);
    });
  };

  const onEliminar = (tareaId: string) => {
    if (!confirm("¿Eliminar esta tarea? No se puede deshacer.")) return;
    startTransition(() => {
      eliminarTarea(tareaId, proyectoId);
    });
  };

  return (
    <TableSurface>
      <Table>
        <TableHeader>
          <TableRow interactive={false}>
            <TableHead>Tarea</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead align="center">Inicio</TableHead>
            <TableHead align="center">Fin</TableHead>
            <TableHead align="right">Avance</TableHead>
            <TableHead align="right">Costo est.</TableHead>
            {puedeEditar && <TableHead align="center"> </TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tareas.map((t) => {
            const estado = t.estado as EstadoTareaProyecto;
            const prioridad = (t.prioridad ?? "media") as PrioridadTarea;
            return (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {t.es_hito ? (
                      <Diamond className="h-3.5 w-3.5 text-amber-600" />
                    ) : t.estado === "completada" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-ink-3" />
                    )}
                    <div>
                      <p className="text-[12.5px] font-medium leading-tight">
                        {t.titulo}
                      </p>
                      {t.descripcion && (
                        <p className="mt-0.5 line-clamp-1 max-w-md text-[10.5px] text-ink-3">
                          {t.descripcion}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {puedeEditar ? (
                    <select
                      value={t.estado}
                      onChange={(e) => onChangeEstado(t.id, e.target.value)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium border-0 ${COLOR_ESTADO_TAREA[estado]}`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_curso">En curso</option>
                      <option value="bloqueada">Bloqueada</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_TAREA[estado]}`}
                    >
                      {ETIQUETA_ESTADO_TAREA[estado]}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_PRIORIDAD[prioridad]}`}
                  >
                    {ETIQUETA_PRIORIDAD[prioridad]}
                  </span>
                </TableCell>
                <TableCell align="center" className="text-xs text-ink-3">
                  {fmtFecha(t.fecha_inicio_planeada)}
                </TableCell>
                <TableCell align="center" className="text-xs text-ink-3">
                  {fmtFecha(t.fecha_fin_planeada)}
                </TableCell>
                <TableCell align="right">
                  {puedeEditar ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={t.porcentaje_avance ?? 0}
                        onBlur={(e) => {
                          const v = Math.max(
                            0,
                            Math.min(100, Number(e.target.value)),
                          );
                          if (v !== (t.porcentaje_avance ?? 0))
                            onChangeAvance(t.id, v);
                        }}
                        className="h-7 w-14 rounded-md border border-input bg-background px-1 text-right text-xs tnum"
                      />
                      <span className="text-[10px] text-ink-3">%</span>
                    </div>
                  ) : (
                    <span className="font-mono text-xs tnum">
                      {t.porcentaje_avance ?? 0}%
                    </span>
                  )}
                </TableCell>
                <TableCell align="right" mono className="text-xs">
                  {t.costo_estimado != null
                    ? fmtMxn.format(Number(t.costo_estimado))
                    : "—"}
                </TableCell>
                {puedeEditar && (
                  <TableCell align="center">
                    <div className="flex items-center justify-center gap-2">
                      <AdjuntarTareaForm
                        proyectoId={proyectoId}
                        tareaId={t.id}
                      />
                      <button
                        onClick={() => onEliminar(t.id)}
                        className="text-ink-4 hover:text-destructive"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableSurface>
  );
}
