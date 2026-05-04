import { AlertTriangle, MessageSquare, Paperclip } from "lucide-react";
import Link from "next/link";

import { KpiCard } from "@/components/ui/kpi-card";
import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
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
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { SolicitudesFiltros } from "./solicitudes-filtros";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

type SearchParams = {
  tab?: "atender" | "mias" | "todas";
  estado?: EstadoSolicitud | "todos";
  tipo?: TipoSolicitud | "todos";
  urgencia?: UrgenciaSolicitud | "todas";
  empresa?: string;
};

type SolicitudRow = {
  id: string;
  proyecto_id: string;
  proyecto_codigo: string | null;
  proyecto_nombre: string | null;
  empresa_codigo: string | null;
  empresa_id: string | null;
  numero: string | null;
  tipo: TipoSolicitud;
  titulo: string;
  monto_estimado: number | null;
  urgencia: UrgenciaSolicitud;
  estado: EstadoSolicitud;
  solicitante_id: string;
  asignado_a_id: string | null;
  num_comentarios: number;
  num_adjuntos: number;
  dias_abierta: number | null;
  created_at: string;
};

export default async function SolicitudesGlobalPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const { data: usrSession } = await supabase.auth.getUser();
  const yo = usrSession.user?.id ?? null;

  const tab = searchParams?.tab ?? "atender";
  const estadoF = searchParams?.estado ?? "todos";
  const tipoF = searchParams?.tipo ?? "todos";
  const urgF = searchParams?.urgencia ?? "todas";
  const empresaF = searchParams?.empresa ?? "";

  // Vista cross-proyecto: la RLS hace el filtro de visibilidad por proyecto
  // (PM, admin, vendedor, director/operativo de empresa, CEO, solicitante,
  // asignado).
  let query = supabase
    .from("v_proyecto_solicitudes_lista")
    .select(
      "id, proyecto_id, proyecto_codigo, proyecto_nombre, empresa_codigo, empresa_id, numero, tipo, titulo, monto_estimado, urgencia, estado, solicitante_id, asignado_a_id, num_comentarios, num_adjuntos, dias_abierta, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (estadoF !== "todos") query = query.eq("estado", estadoF);
  if (tipoF !== "todos") query = query.eq("tipo", tipoF);
  if (urgF !== "todas") query = query.eq("urgencia", urgF);
  if (empresaF) query = query.eq("empresa_id", empresaF);

  const { data } = (await query) as { data: SolicitudRow[] | null };
  const todas: SolicitudRow[] = (data ?? []) as SolicitudRow[];

  // Filtro por tab (client-side sobre el resultado RLS)
  const lista =
    tab === "mias"
      ? todas.filter((s) => s.solicitante_id === yo)
      : tab === "atender"
        ? todas.filter(
            (s) =>
              ESTADOS_ACTIVOS.includes(s.estado) &&
              (s.asignado_a_id === yo ||
                (!s.asignado_a_id && (esCEO(v) || tieneAtributo(v, "tesorero_corporativo")))),
          )
        : todas;

  // KPIs
  const totalActivas = todas.filter((s) =>
    ESTADOS_ACTIVOS.includes(s.estado),
  ).length;
  const totalCriticas = todas.filter(
    (s) => s.urgencia === "critica" && ESTADOS_ACTIVOS.includes(s.estado),
  ).length;
  const totalSinAsignar = todas.filter(
    (s) => !s.asignado_a_id && ESTADOS_ACTIVOS.includes(s.estado),
  ).length;

  // Empresas para filtro
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial, razon_social")
    .eq("activa", true)
    .order("codigo");

  const buildHref = (overrides: Partial<SearchParams>): string => {
    const next = new URLSearchParams();
    const merged = { tab, estado: estadoF, tipo: tipoF, urgencia: urgF, empresa: empresaF, ...overrides };
    if (merged.tab && merged.tab !== "atender") next.set("tab", merged.tab);
    if (merged.estado && merged.estado !== "todos") next.set("estado", merged.estado);
    if (merged.tipo && merged.tipo !== "todos") next.set("tipo", merged.tipo);
    if (merged.urgencia && merged.urgencia !== "todas")
      next.set("urgencia", merged.urgencia);
    if (merged.empresa) next.set("empresa", merged.empresa);
    const qs = next.toString();
    return qs ? `/solicitudes?${qs}` : "/solicitudes";
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6">
        <p className="lbl-mini">Operación · Comunicación</p>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Solicitudes
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Vista cross-proyecto. Filtra por estado, tipo o urgencia para enfocar.
        </p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Activas"
          value={String(totalActivas)}
          sub="Solicitada / En revisión / Aprobada"
        />
        <KpiCard
          label="Críticas activas"
          value={String(totalCriticas)}
          accent={totalCriticas > 0 ? "danger" : "ok"}
        />
        <KpiCard
          label="Sin asignar"
          value={String(totalSinAsignar)}
          accent={totalSinAsignar > 0 ? "warn" : "ok"}
        />
        <KpiCard
          label="Total visibles"
          value={String(todas.length)}
          sub={`${todas.length === 500 ? "límite 500" : ""}`}
        />
      </div>

      {/* Tabs */}
      <nav
        aria-label="Tabs"
        className="mb-3 flex flex-wrap items-center gap-1 border-b border-border"
      >
        {(
          [
            { k: "atender", label: "Por atender" },
            { k: "mias", label: "Mías" },
            { k: "todas", label: "Todas" },
          ] as const
        ).map((t) => (
          <Link
            key={t.k}
            href={buildHref({ tab: t.k })}
            aria-current={tab === t.k ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
              tab === t.k
                ? "border-brand text-brand"
                : "border-transparent text-ink-3 hover:border-divider hover:text-ink-1",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Filtros */}
      <SolicitudesFiltros
        estadoF={estadoF}
        tipoF={tipoF}
        urgF={urgF}
        empresaF={empresaF}
        empresas={(empresas ?? []).map((e) => ({
          id: e.id,
          codigo: e.codigo,
        }))}
        tab={tab}
      />

      {/* Lista */}
      {lista.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-ink-3">
          {tab === "atender"
            ? "No tienes solicitudes asignadas pendientes."
            : "Sin solicitudes con los filtros seleccionados."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {lista.map((s) => {
            return (
              <li
                key={s.id}
                className="overflow-hidden rounded-md border border-border bg-card hover:bg-bg-2/40"
              >
                <Link
                  href={`/proyectos/${s.proyecto_id}?tab=solicitudes&sol=${s.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-left"
                >
                  <span className="rounded-full bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">
                    {s.empresa_codigo}
                  </span>
                  <span className="font-mono text-[10.5px] text-ink-3">
                    {s.proyecto_codigo}
                  </span>
                  <code className="font-mono text-[10.5px] text-ink-3">
                    {s.numero ?? "—"}
                  </code>
                  <span className="rounded-full bg-bg-2 px-1.5 py-0.5 text-[10px] uppercase text-ink-2">
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
                  <span className="min-w-[200px] flex-1 truncate text-[12.5px] font-medium">
                    {s.titulo}
                  </span>
                  {s.monto_estimado != null && (
                    <span className="font-mono text-[11px] text-ink-3">
                      {fmtMxn.format(Number(s.monto_estimado))}
                    </span>
                  )}
                  {s.urgencia === "critica" &&
                    ESTADOS_ACTIVOS.includes(s.estado) && (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-700" />
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
                    {s.dias_abierta != null
                      ? `${s.dias_abierta}d`
                      : "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
