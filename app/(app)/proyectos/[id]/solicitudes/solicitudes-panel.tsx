"use client";

import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  COLOR_ESTADO_SOLICITUD,
  COLOR_URGENCIA,
  ESTADOS_ACTIVOS,
  ETIQUETA_ESTADO_SOLICITUD,
  ETIQUETA_TIPO_SOLICITUD,
  ETIQUETA_URGENCIA,
  type EstadoSolicitud,
  type TipoSolicitud,
  type UrgenciaSolicitud,
} from "@/lib/solicitudes/state";
import { cn } from "@/lib/utils";

import { NuevaSolicitudForm } from "./nueva-solicitud-form";
import { SolicitudDetalle } from "./solicitud-detalle";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const fmtFecha = (d: string | null) =>
  !d
    ? "—"
    : new Date(d).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
      });

export type SolicitudListItem = {
  id: string;
  numero: string | null;
  tipo: TipoSolicitud;
  titulo: string;
  descripcion: string | null;
  monto_estimado: number | null;
  urgencia: UrgenciaSolicitud;
  estado: EstadoSolicitud;
  solicitante_id: string;
  asignado_a_id: string | null;
  campos_tipo: Record<string, unknown>;
  entidades_relacionadas: Record<string, string>;
  razon_rechazo: string | null;
  resuelta_at: string | null;
  created_at: string;
  num_comentarios: number;
  num_adjuntos: number;
};

export type Persona = {
  user_id: string;
  nombre: string;
};

export function SolicitudesPanel({
  proyectoId,
  empresaId,
  proyectoCodigo,
  clienteId,
  clienteRazonSocial,
  empresasGrupo,
  serviciosGrupo,
  proveedores,
  candidatosAsignacion,
  initialSolicitudes,
  expandirInicial,
  puedeAprobar,
  esCEOoDirector,
  yo,
}: {
  proyectoId: string;
  empresaId: string;
  proyectoCodigo: string;
  clienteId: string | null;
  clienteRazonSocial: string | null;
  empresasGrupo: Array<{ id: string; codigo: string; nombre: string }>;
  serviciosGrupo: Array<{
    id: string;
    empresa_id: string;
    codigo: string;
    nombre: string;
    unidad: string | null;
    costo_base: number | null;
    margen_inter_co: number | null;
    precio_inter_co: number | null;
  }>;
  proveedores: Array<{
    id: string;
    razon_social: string;
    rfc: string | null;
    nombre_comercial: string | null;
  }>;
  candidatosAsignacion: Persona[];
  initialSolicitudes: SolicitudListItem[];
  expandirInicial?: string;
  puedeAprobar: boolean;
  esCEOoDirector: boolean;
  yo: string | null;
}) {
  const [solicitudes] = useState(initialSolicitudes);
  const [expandida, setExpandida] = useState<string | null>(
    expandirInicial ?? null,
  );
  const [showForm, setShowForm] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"activas" | "todas">(
    "activas",
  );
  const [filtroTipo, setFiltroTipo] = useState<TipoSolicitud | "todos">(
    "todos",
  );

  const filtradas = solicitudes.filter((s) => {
    if (filtroEstado === "activas" && !ESTADOS_ACTIVOS.includes(s.estado))
      return false;
    if (filtroTipo !== "todos" && s.tipo !== filtroTipo) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Estado
          </span>
          {(["activas", "todas"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFiltroEstado(k)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium",
                filtroEstado === k
                  ? "bg-brand text-brand-fg"
                  : "bg-bg-2 text-ink-2 hover:bg-bg-3",
              )}
            >
              {k === "activas" ? "Activas" : "Todas"}
            </button>
          ))}
          <span className="ml-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Tipo
          </span>
          <select
            value={filtroTipo}
            onChange={(e) =>
              setFiltroTipo(e.target.value as TipoSolicitud | "todos")
            }
            className="h-7 rounded border border-border bg-card px-1.5 text-[11px]"
          >
            <option value="todos">Todos</option>
            {(Object.keys(ETIQUETA_TIPO_SOLICITUD) as TipoSolicitud[]).map(
              (t) => (
                <option key={t} value={t}>
                  {ETIQUETA_TIPO_SOLICITUD[t]}
                </option>
              ),
            )}
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? (
            <>
              <X className="h-3.5 w-3.5" />
              Cancelar
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Nueva solicitud
            </>
          )}
        </Button>
      </div>

      {/* Form de creación */}
      {showForm && (
        <NuevaSolicitudForm
          proyectoId={proyectoId}
          empresaId={empresaId}
          proyectoCodigo={proyectoCodigo}
          clienteId={clienteId}
          clienteRazonSocial={clienteRazonSocial}
          empresasGrupo={empresasGrupo}
          serviciosGrupo={serviciosGrupo}
          proveedores={proveedores}
          onCreated={() => setShowForm(false)}
        />
      )}

      {/* Lista */}
      {filtradas.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-ink-3">
          {solicitudes.length === 0
            ? "Aún no hay solicitudes en este proyecto."
            : "Sin solicitudes con los filtros."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {filtradas.map((s) => {
            const isOpen = expandida === s.id;
            return (
              <li
                key={s.id}
                className="overflow-hidden rounded-md border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() => setExpandida(isOpen ? null : s.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bg-2"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                  )}
                  <code className="font-mono text-[11px] text-ink-3">
                    {s.numero ?? "—"}
                  </code>
                  <span className="rounded-full bg-bg-2 px-1.5 py-0.5 text-[10px] font-medium uppercase text-ink-2">
                    {ETIQUETA_TIPO_SOLICITUD[s.tipo]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      COLOR_URGENCIA[s.urgencia],
                    )}
                  >
                    {ETIQUETA_URGENCIA[s.urgencia]}
                  </span>
                  <span className="flex-1 truncate text-[12.5px] font-medium">
                    {s.titulo}
                  </span>
                  {s.monto_estimado != null && (
                    <span className="font-mono text-[11px] text-ink-3">
                      {fmtMxn.format(Number(s.monto_estimado))}
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                      COLOR_ESTADO_SOLICITUD[s.estado],
                    )}
                  >
                    {ETIQUETA_ESTADO_SOLICITUD[s.estado]}
                  </span>
                  {s.num_comentarios > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10.5px] text-ink-3">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {s.num_comentarios}
                    </span>
                  )}
                  {s.num_adjuntos > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10.5px] text-ink-3">
                      <Paperclip className="h-2.5 w-2.5" />
                      {s.num_adjuntos}
                    </span>
                  )}
                  <span className="text-[10.5px] text-ink-4">
                    {fmtFecha(s.created_at)}
                  </span>
                </button>

                {isOpen && (
                  <SolicitudDetalle
                    solicitud={s}
                    proyectoId={proyectoId}
                    candidatosAsignacion={candidatosAsignacion}
                    puedeAprobar={puedeAprobar}
                    esCEOoDirector={esCEOoDirector}
                    yo={yo}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
