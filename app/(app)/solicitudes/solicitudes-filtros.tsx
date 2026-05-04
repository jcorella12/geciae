"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ETIQUETA_ESTADO_SOLICITUD,
  ETIQUETA_TIPO_SOLICITUD,
  ETIQUETA_URGENCIA,
  type EstadoSolicitud,
  type TipoSolicitud,
  type UrgenciaSolicitud,
} from "@/lib/solicitudes/state";
import { cn } from "@/lib/utils";

type Tab = "atender" | "mias" | "todas";

/**
 * Filtros del listado /solicitudes (tab + estado + tipo + urgencia + empresa).
 *
 * Es Client porque usa onChange en selects para navegar inmediatamente.
 * Los chips de empresa son Links normales.
 */
export function SolicitudesFiltros({
  estadoF,
  tipoF,
  urgF,
  empresaF,
  empresas,
  tab,
}: {
  estadoF: EstadoSolicitud | "todos";
  tipoF: TipoSolicitud | "todos";
  urgF: UrgenciaSolicitud | "todas";
  empresaF: string;
  empresas: Array<{ id: string; codigo: string }>;
  tab: Tab;
}) {
  const router = useRouter();

  const buildHref = (overrides: Record<string, string>): string => {
    const next = new URLSearchParams();
    const merged: Record<string, string> = {
      tab,
      estado: estadoF,
      tipo: tipoF,
      urgencia: urgF,
      empresa: empresaF,
      ...overrides,
    };
    if (merged.tab && merged.tab !== "atender") next.set("tab", merged.tab);
    if (merged.estado && merged.estado !== "todos")
      next.set("estado", merged.estado);
    if (merged.tipo && merged.tipo !== "todos") next.set("tipo", merged.tipo);
    if (merged.urgencia && merged.urgencia !== "todas")
      next.set("urgencia", merged.urgencia);
    if (merged.empresa) next.set("empresa", merged.empresa);
    const qs = next.toString();
    return qs ? `/solicitudes?${qs}` : "/solicitudes";
  };

  const navigate = (overrides: Record<string, string>) => {
    router.push(buildHref(overrides));
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 shadow-xs">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Estado
      </span>
      <select
        value={estadoF}
        onChange={(e) => navigate({ estado: e.target.value })}
        className="h-7 rounded border border-border bg-card px-1.5 text-[11px]"
      >
        <option value="todos">Todos</option>
        {(Object.keys(ETIQUETA_ESTADO_SOLICITUD) as EstadoSolicitud[]).map(
          (e) => (
            <option key={e} value={e}>
              {ETIQUETA_ESTADO_SOLICITUD[e]}
            </option>
          ),
        )}
      </select>

      <span className="ml-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Tipo
      </span>
      <select
        value={tipoF}
        onChange={(e) => navigate({ tipo: e.target.value })}
        className="h-7 rounded border border-border bg-card px-1.5 text-[11px]"
      >
        <option value="todos">Todos</option>
        {(Object.keys(ETIQUETA_TIPO_SOLICITUD) as TipoSolicitud[]).map((t) => (
          <option key={t} value={t}>
            {ETIQUETA_TIPO_SOLICITUD[t]}
          </option>
        ))}
      </select>

      <span className="ml-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Urgencia
      </span>
      <select
        value={urgF}
        onChange={(e) => navigate({ urgencia: e.target.value })}
        className="h-7 rounded border border-border bg-card px-1.5 text-[11px]"
      >
        <option value="todas">Todas</option>
        {(Object.keys(ETIQUETA_URGENCIA) as UrgenciaSolicitud[]).map((u) => (
          <option key={u} value={u}>
            {ETIQUETA_URGENCIA[u]}
          </option>
        ))}
      </select>

      <span className="ml-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Empresa
      </span>
      <Link
        href={buildHref({ empresa: "" })}
        className={cn(
          "rounded-md px-2 py-1 text-[11px] font-medium",
          !empresaF
            ? "bg-brand text-brand-fg"
            : "bg-bg-2 text-ink-2 hover:bg-bg-3",
        )}
      >
        Todas
      </Link>
      {empresas.map((e) => (
        <Link
          key={e.id}
          href={buildHref({ empresa: e.id })}
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-medium",
            empresaF === e.id
              ? "bg-brand text-brand-fg"
              : "bg-bg-2 text-ink-2 hover:bg-bg-3",
          )}
        >
          {e.codigo}
        </Link>
      ))}
    </div>
  );
}
