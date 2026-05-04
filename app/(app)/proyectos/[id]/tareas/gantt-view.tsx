"use client";

import { Diamond } from "lucide-react";
import { useMemo, useState } from "react";

import {
  COLOR_BAR_TAREA,
  ETIQUETA_ESTADO_TAREA,
  type EstadoTareaProyecto,
} from "@/lib/proyecto-tareas/state";

import type { TareaRow } from "./tareas-panel";

type Escala = "dia" | "semana" | "mes";

const MS_DIA = 86_400_000;

const fmtFechaCorta = (d: Date) =>
  d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

const fmtMes = (d: Date) =>
  d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diasEntre(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_DIA);
}

export function GanttView({ tareas }: { tareas: TareaRow[] }) {
  const [escala, setEscala] = useState<Escala>("semana");

  const { rango, tareasConFecha } = useMemo(() => {
    const conFecha = tareas.filter(
      (t) => t.fecha_inicio_planeada && t.fecha_fin_planeada,
    );

    if (conFecha.length === 0) {
      const hoy = new Date();
      return {
        rango: {
          inicio: startOfDay(hoy),
          fin: startOfDay(new Date(hoy.getTime() + 30 * MS_DIA)),
        },
        tareasConFecha: [] as TareaRow[],
      };
    }

    let min = new Date(conFecha[0].fecha_inicio_planeada!);
    let max = new Date(conFecha[0].fecha_fin_planeada!);
    for (const t of conFecha) {
      const ti = new Date(t.fecha_inicio_planeada!);
      const tf = new Date(t.fecha_fin_planeada!);
      if (ti < min) min = ti;
      if (tf > max) max = tf;
    }
    // padding 3 días a cada lado
    min = new Date(min.getTime() - 3 * MS_DIA);
    max = new Date(max.getTime() + 3 * MS_DIA);

    return {
      rango: { inicio: startOfDay(min), fin: startOfDay(max) },
      tareasConFecha: conFecha,
    };
  }, [tareas]);

  const totalDias = Math.max(diasEntre(rango.inicio, rango.fin) + 1, 1);
  const pxPorDia = escala === "dia" ? 32 : escala === "semana" ? 12 : 4;
  const anchoTotal = totalDias * pxPorDia;

  const sinFecha = tareas.filter(
    (t) => !t.fecha_inicio_planeada || !t.fecha_fin_planeada,
  );

  // Generar headers (dias o semanas o meses)
  const headerCells = useMemo(() => {
    const cells: { label: string; width: number; isWeekend?: boolean }[] = [];
    if (escala === "dia") {
      for (let i = 0; i < totalDias; i++) {
        const d = new Date(rango.inicio.getTime() + i * MS_DIA);
        const dow = d.getDay();
        cells.push({
          label: d.getDate().toString(),
          width: pxPorDia,
          isWeekend: dow === 0 || dow === 6,
        });
      }
    } else if (escala === "semana") {
      let i = 0;
      while (i < totalDias) {
        const d = new Date(rango.inicio.getTime() + i * MS_DIA);
        // jumps to next monday or end
        const remainingInWeek = 7 - ((d.getDay() + 6) % 7);
        const dur = Math.min(remainingInWeek, totalDias - i);
        cells.push({
          label: fmtFechaCorta(d),
          width: dur * pxPorDia,
        });
        i += dur;
      }
    } else {
      // mes
      let i = 0;
      while (i < totalDias) {
        const d = new Date(rango.inicio.getTime() + i * MS_DIA);
        const finMes = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const dur = Math.min(diasEntre(d, finMes), totalDias - i);
        cells.push({ label: fmtMes(d), width: dur * pxPorDia });
        i += dur;
      }
    }
    return cells;
  }, [escala, rango.inicio, totalDias, pxPorDia]);

  // Línea hoy
  const hoy = startOfDay(new Date());
  const offsetHoy = diasEntre(rango.inicio, hoy);
  const hoyVisible = offsetHoy >= 0 && offsetHoy <= totalDias;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-divider px-4 py-2">
        <h3 className="text-[13px] font-semibold">
          Gantt · {tareasConFecha.length} con fechas
        </h3>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {(["dia", "semana", "mes"] as const).map((e) => (
            <button
              key={e}
              onClick={() => setEscala(e)}
              className={`rounded-sm px-2.5 py-0.5 text-[11px] font-medium ${
                escala === e
                  ? "bg-bg-2 text-ink-1"
                  : "text-ink-3 hover:text-ink-1"
              }`}
            >
              {e === "dia" ? "Día" : e === "semana" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {tareasConFecha.length === 0 ? (
        <p className="p-8 text-center text-sm text-ink-3">
          Ninguna tarea tiene fecha de inicio y fin planeadas. Edítalas para
          verlas en el Gantt.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: 320 + anchoTotal }} className="text-[11.5px]">
            {/* Header */}
            <div className="flex border-b border-divider sticky top-0 bg-card z-10">
              <div className="w-[320px] flex-shrink-0 px-3 py-1.5 font-semibold border-r border-divider">
                Tarea
              </div>
              <div className="flex">
                {headerCells.map((c, i) => (
                  <div
                    key={i}
                    style={{ width: c.width }}
                    className={`text-center text-[10px] py-1.5 border-r border-divider/50 truncate ${
                      c.isWeekend ? "bg-bg-2/50 text-ink-4" : "text-ink-3"
                    }`}
                  >
                    {c.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div className="relative">
              {hoyVisible && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                  style={{ left: 320 + offsetHoy * pxPorDia }}
                  title="Hoy"
                />
              )}
              {tareasConFecha.map((t) => {
                const ini = new Date(t.fecha_inicio_planeada!);
                const fin = new Date(t.fecha_fin_planeada!);
                const offset = diasEntre(rango.inicio, ini);
                const dur = Math.max(diasEntre(ini, fin) + 1, 1);
                const left = offset * pxPorDia;
                const width = Math.max(dur * pxPorDia, 4);
                const estado = t.estado as EstadoTareaProyecto;
                const color = COLOR_BAR_TAREA[estado];
                const avance = Math.max(0, Math.min(100, t.porcentaje_avance ?? 0));

                return (
                  <div
                    key={t.id}
                    className="flex border-b border-divider/40 hover:bg-bg-2/30 group"
                  >
                    <div className="w-[320px] flex-shrink-0 px-3 py-1.5 border-r border-divider truncate">
                      <div className="flex items-center gap-1.5">
                        {t.es_hito && (
                          <Diamond className="h-3 w-3 flex-shrink-0 text-amber-600" />
                        )}
                        <span className="text-[12px] font-medium truncate">
                          {t.titulo}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-3 truncate">
                        {ETIQUETA_ESTADO_TAREA[estado]} · {avance}%
                      </p>
                    </div>
                    <div className="relative h-[42px] flex-grow">
                      {t.es_hito ? (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                          style={{ left: left + width / 2 }}
                          title={`${t.titulo} · ${fmtFechaCorta(ini)}`}
                        >
                          <Diamond
                            className="h-4 w-4 text-amber-500 fill-amber-400"
                          />
                        </div>
                      ) : (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 rounded-md shadow-xs overflow-hidden"
                          style={{
                            left,
                            width,
                            height: 18,
                            backgroundColor: color + "40",
                            border: `1px solid ${color}`,
                          }}
                          title={`${t.titulo} · ${fmtFechaCorta(ini)} → ${fmtFechaCorta(fin)} · ${avance}%`}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${avance}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {sinFecha.length > 0 && (
        <div className="border-t border-divider bg-bg-2/40 px-4 py-2">
          <p className="text-[11px] text-ink-3">
            <span className="font-medium">{sinFecha.length}</span> tareas sin
            fechas planeadas (no aparecen en el Gantt)
          </p>
        </div>
      )}
    </div>
  );
}
