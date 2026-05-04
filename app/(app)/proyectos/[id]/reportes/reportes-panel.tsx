"use client";

import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";

import {
  COLOR_ESTADO_REPORTE,
  COLOR_SEVERIDAD,
  COLOR_TIPO_REPORTE,
  ETIQUETA_ESTADO_REPORTE,
  ETIQUETA_SEVERIDAD,
  ETIQUETA_TIPO_REPORTE,
  ICONO_TIPO_REPORTE,
  type EstadoReporte,
  type SeveridadReporte,
  type TipoReporteProyecto,
} from "@/lib/proyecto-reportes/state";
import { cn } from "@/lib/utils";

import {
  actualizarEstadoReporte,
  eliminarReporte,
  getDownloadUrlReporte,
} from "./actions";
import { AdjuntarArchivoForm } from "./adjuntar-form";
import { ReporteForm } from "./reporte-form";

export type ReporteRow = {
  id: string;
  numero: string;
  tipo: TipoReporteProyecto;
  severidad: SeveridadReporte | null;
  estado: EstadoReporte;
  titulo: string;
  resumen: string | null;
  contenido: string | null;
  fecha_evento: string | null;
  fecha_reporte: string;
  ubicacion: string | null;
  impacto: string | null;
  accion_correctiva: string | null;
  responsable_nombre: string | null;
  fecha_compromiso: string | null;
  fecha_resolucion: string | null;
  visible_cliente: boolean | null;
  creado_por_nombre: string | null;
  tarea_titulo: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adjuntos: any;
  created_at: string;
};

type Candidato = {
  usuario_id: string;
  nombre_completo: string;
  puesto: string | null;
};

const fmtFecha = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtBytes = (b: number | null | undefined) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const TIPOS = Object.keys(ETIQUETA_TIPO_REPORTE) as TipoReporteProyecto[];

export function ReportesPanel({
  proyectoId,
  reportes,
  candidatos,
  puedeEditar,
}: {
  proyectoId: string;
  reportes: ReporteRow[];
  candidatos: Candidato[];
  puedeEditar: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<TipoReporteProyecto | "todos">(
    "todos",
  );
  const [filtroEstado, setFiltroEstado] = useState<EstadoReporte | "todos">(
    "todos",
  );
  const [expandido, setExpandido] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtrados = reportes.filter((r) => {
    if (filtroTipo !== "todos" && r.tipo !== filtroTipo) return false;
    if (filtroEstado !== "todos" && r.estado !== filtroEstado) return false;
    return true;
  });

  const onCambiarEstado = (id: string, nuevo: string) => {
    startTransition(() => {
      actualizarEstadoReporte(id, proyectoId, nuevo);
    });
  };

  const onEliminar = (id: string) => {
    if (
      !confirm(
        "¿Eliminar el reporte y sus adjuntos? Esta acción no se puede deshacer.",
      )
    )
      return;
    startTransition(() => {
      eliminarReporte(id, proyectoId);
    });
  };

  const onDescargar = async (path: string) => {
    const url = await getDownloadUrlReporte(path);
    if (url) window.open(url, "_blank", "noopener");
    else alert("No se pudo generar enlace de descarga.");
  };

  // Conteos por tipo (solo en visibles)
  const conteoPorTipo = TIPOS.map((t) => ({
    tipo: t,
    n: reportes.filter((r) => r.tipo === t).length,
  })).filter((c) => c.n > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold">
            Reportes formales ({reportes.length})
          </h3>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            Documentos estructurados para incidentes, avances, inspecciones,
            siniestros y cualquier eventualidad.
          </p>
        </div>
        {puedeEditar && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-md border border-brand bg-brand-soft px-3 py-1.5 text-[12.5px] font-medium text-brand-deep hover:bg-brand hover:text-brand-fg"
          >
            {showForm ? (
              "Cancelar"
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Nuevo reporte
              </>
            )}
          </button>
        )}
      </div>

      {showForm && (
        <ReporteForm
          proyectoId={proyectoId}
          candidatos={candidatos}
          onCreated={() => setShowForm(false)}
        />
      )}

      {/* Filtros */}
      {reportes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-divider bg-bg-2/40 px-3 py-2">
          <span className="text-[11px] font-medium text-ink-3">Tipo:</span>
          <button
            onClick={() => setFiltroTipo("todos")}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              filtroTipo === "todos"
                ? "bg-ink-1 text-bg-1"
                : "bg-card text-ink-2 hover:bg-bg-3",
            )}
          >
            Todos
          </button>
          {conteoPorTipo.map((c) => (
            <button
              key={c.tipo}
              onClick={() => setFiltroTipo(c.tipo)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                filtroTipo === c.tipo
                  ? "bg-ink-1 text-bg-1"
                  : `${COLOR_TIPO_REPORTE[c.tipo]} hover:opacity-80`,
              )}
            >
              {ICONO_TIPO_REPORTE[c.tipo]} {ETIQUETA_TIPO_REPORTE[c.tipo]} (
              {c.n})
            </button>
          ))}
          <span className="ml-2 text-[11px] font-medium text-ink-3">
            Estado:
          </span>
          <select
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(e.target.value as EstadoReporte | "todos")
            }
            className="h-7 rounded-md border border-input bg-background px-2 text-[11.5px]"
          >
            <option value="todos">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="emitido">Emitido</option>
            <option value="en_seguimiento">En seguimiento</option>
            <option value="resuelto">Resuelto</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </div>
      )}

      {filtrados.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          {reportes.length === 0
            ? "Sin reportes registrados. Crea uno cuando ocurra una eventualidad o necesites documentar avances."
            : "No hay reportes con ese filtro."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {filtrados.map((r) => {
            const abierto = expandido === r.id;
            const adjuntos =
              (r.adjuntos as Array<{
                path: string;
                nombre: string;
                size: number;
                mime: string;
              }> | null) ?? [];
            return (
              <li
                key={r.id}
                className={cn(
                  "rounded-lg border bg-card shadow-xs transition",
                  r.severidad === "critica" || r.severidad === "alta"
                    ? "border-danger/40"
                    : "border-border",
                  abierto && "ring-1 ring-brand/30",
                )}
              >
                {/* Header colapsado */}
                <div
                  onClick={() => setExpandido(abierto ? null : r.id)}
                  className="flex cursor-pointer items-start gap-3 p-3.5"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-base",
                      COLOR_TIPO_REPORTE[r.tipo],
                    )}
                  >
                    {ICONO_TIPO_REPORTE[r.tipo]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <code className="font-mono text-[10.5px] text-ink-3">
                        {r.numero}
                      </code>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-px text-[10px] font-medium",
                          COLOR_TIPO_REPORTE[r.tipo],
                        )}
                      >
                        {ETIQUETA_TIPO_REPORTE[r.tipo]}
                      </span>
                      {r.severidad && r.severidad !== "info" && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-px text-[10px] font-medium uppercase",
                            COLOR_SEVERIDAD[r.severidad],
                          )}
                        >
                          {ETIQUETA_SEVERIDAD[r.severidad]}
                        </span>
                      )}
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-px text-[10px] font-medium",
                          COLOR_ESTADO_REPORTE[r.estado],
                        )}
                      >
                        {ETIQUETA_ESTADO_REPORTE[r.estado]}
                      </span>
                      {r.visible_cliente && (
                        <span className="flex items-center gap-1 rounded-full bg-info-soft px-1.5 py-px text-[9.5px] text-info-deep">
                          <Eye className="h-2.5 w-2.5" />
                          Cliente
                        </span>
                      )}
                      {adjuntos.length > 0 && (
                        <span className="flex items-center gap-1 text-[10.5px] text-ink-3">
                          <Paperclip className="h-3 w-3" />
                          {adjuntos.length}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-1 text-[13.5px] font-semibold leading-tight">
                      {r.titulo}
                    </h4>
                    {r.resumen && (
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-3">
                        {r.resumen}
                      </p>
                    )}
                    <p className="mt-1 text-[10.5px] text-ink-4">
                      {fmtFecha(r.fecha_reporte)}
                      {r.creado_por_nombre && ` · ${r.creado_por_nombre}`}
                      {r.responsable_nombre &&
                        ` · responsable: ${r.responsable_nombre}`}
                    </p>
                  </div>
                  <button
                    className="text-ink-4 hover:text-ink-1"
                    aria-label="Expandir"
                  >
                    {abierto ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Detalle expandido */}
                {abierto && (
                  <div className="border-t border-divider p-4">
                    <dl className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
                      {r.fecha_evento && (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wider text-ink-3">
                            Evento
                          </dt>
                          <dd className="mt-0.5">{fmtFecha(r.fecha_evento)}</dd>
                        </div>
                      )}
                      {r.ubicacion && (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wider text-ink-3">
                            Ubicación
                          </dt>
                          <dd className="mt-0.5">{r.ubicacion}</dd>
                        </div>
                      )}
                      {r.impacto && (
                        <div className="col-span-2">
                          <dt className="text-[10px] uppercase tracking-wider text-ink-3">
                            Impacto
                          </dt>
                          <dd className="mt-0.5">{r.impacto}</dd>
                        </div>
                      )}
                      {r.fecha_compromiso && (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wider text-ink-3">
                            Fecha compromiso
                          </dt>
                          <dd className="mt-0.5">
                            {fmtFecha(r.fecha_compromiso)}
                          </dd>
                        </div>
                      )}
                      {r.fecha_resolucion && (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wider text-ink-3">
                            Resuelto
                          </dt>
                          <dd className="mt-0.5">
                            {fmtFecha(r.fecha_resolucion)}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {r.contenido && (
                      <div className="mt-4">
                        <h5 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                          Contenido
                        </h5>
                        <pre className="whitespace-pre-wrap rounded-md border border-divider bg-bg-2/40 p-3 font-mono text-[11.5px] leading-relaxed">
                          {r.contenido}
                        </pre>
                      </div>
                    )}

                    {r.accion_correctiva && (
                      <div className="mt-4">
                        <h5 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                          Acción correctiva
                        </h5>
                        <p className="rounded-md border border-divider bg-warn-soft/30 p-3 text-[12.5px]">
                          {r.accion_correctiva}
                        </p>
                      </div>
                    )}

                    {/* Adjuntos */}
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <h5 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                          Adjuntos ({adjuntos.length})
                        </h5>
                        {puedeEditar && (
                          <AdjuntarArchivoForm
                            proyectoId={proyectoId}
                            reporteId={r.id}
                          />
                        )}
                      </div>
                      {adjuntos.length === 0 ? (
                        <p className="text-[11px] text-ink-4">
                          Sin archivos adjuntos.
                        </p>
                      ) : (
                        <ul className="grid gap-1.5 sm:grid-cols-2">
                          {adjuntos.map((a, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 rounded-md border border-divider bg-bg-2/30 px-2.5 py-1.5"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                              <button
                                onClick={() => onDescargar(a.path)}
                                className="min-w-0 flex-1 truncate text-left text-[11.5px] hover:text-brand"
                                title={a.nombre}
                              >
                                {a.nombre}
                              </button>
                              <span className="text-[10px] text-ink-4">
                                {fmtBytes(a.size)}
                              </span>
                              <button
                                onClick={() => onDescargar(a.path)}
                                className="text-ink-4 hover:text-brand"
                                aria-label="Descargar"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Footer: estado + acciones */}
                    {puedeEditar && (
                      <div className="mt-4 flex items-center gap-2 border-t border-divider pt-3">
                        <span className="text-[11px] text-ink-3">Estado:</span>
                        <select
                          value={r.estado}
                          onChange={(e) =>
                            onCambiarEstado(r.id, e.target.value)
                          }
                          className="h-7 rounded-md border border-input bg-background px-2 text-[11.5px]"
                        >
                          <option value="borrador">Borrador</option>
                          <option value="emitido">Emitido</option>
                          <option value="en_seguimiento">En seguimiento</option>
                          <option value="resuelto">Resuelto</option>
                          <option value="cerrado">Cerrado</option>
                        </select>
                        <button
                          onClick={() => onEliminar(r.id)}
                          className="ml-auto flex items-center gap-1 text-[11px] text-ink-4 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
