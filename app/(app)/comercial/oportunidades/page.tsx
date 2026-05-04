import { Plus, TrendingUp } from "lucide-react";
import Link from "next/link";

import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { obtenerVinculos, esCEO, esRolEn } from "@/lib/auth/permisos";
import {
  COLOR_ESTADO_OPORTUNIDAD,
  ETAPAS_PIPELINE,
  ETIQUETA_ESTADO_OPORTUNIDAD,
  ETIQUETA_FUENTE,
  type EstadoOportunidad,
  type FuenteOportunidad,
  valorPonderado,
} from "@/lib/oportunidades/state";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
} from "@/lib/empresa-activa";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

import { KanbanPipeline } from "./kanban-pipeline";

export const dynamic = "force-dynamic";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const fmtMxnShort = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

type SearchParams = {
  empresa?: string;
  vendedor?: string;
  vista?: "kanban" | "tabla";
};

export default async function OportunidadesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeEditarPipeline =
    esCEO(vinculos) ||
    vinculos.some(
      (v) =>
        ["director", "operativo"].includes(v.rol) ||
        esRolEn(vinculos, v.empresa_id, ["director", "operativo"]),
    );

  // Filtro por empresa activa del switcher
  const filtroSwitcher = resolverEmpresasFiltro({
    cookieValue: cookies().get(EMPRESA_COOKIE)?.value ?? null,
    empresasUsuario: vinculos.map((v) => v.empresa_id),
    puedeConsolidado: puedeVerConsolidado(vinculos),
  });

  const sp = searchParams ?? {};
  const empresaFiltro = sp.empresa ?? "";
  const vista = (sp.vista as string) ?? "kanban";

  // Cargar oportunidades activas (no terminales) + ganadas/perdidas últimos 90 días
  const noventaDiasAtras = new Date();
  noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90);
  const noventaDiasISO = noventaDiasAtras.toISOString();

  let query = supabase
    .from("oportunidades")
    .select(
      "id, empresa_id, cliente_id, vendedor_id, nombre, estado, monto_estimado, probabilidad, fuente, fecha_proxima_accion, proxima_accion, fecha_cierre_estimada, fecha_cierre_real, created_at, clientes(razon_social, nombre_comercial), empresas(codigo)",
    )
    .in("empresa_id", filtroSwitcher.empresasIds)
    .order("created_at", { ascending: false });

  if (empresaFiltro) query = query.eq("empresa_id", empresaFiltro);

  const { data: ops, error } = await query;
  let lista = ops ?? [];

  // Filtrar las terminales viejas (>90 días)
  lista = lista.filter((o) => {
    if (o.estado === "ganado" || o.estado === "perdido") {
      return (o.fecha_cierre_real ?? o.created_at ?? "") >= noventaDiasISO;
    }
    return true;
  });

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial")
    .eq("activa", true)
    .order("codigo");

  // KPIs
  const activas = lista.filter(
    (o) => !["ganado", "perdido"].includes(o.estado as string),
  );
  const ganadas = lista.filter((o) => o.estado === "ganado");
  const perdidas = lista.filter((o) => o.estado === "perdido");
  const pipelineMonto = activas.reduce(
    (a, o) => a + Number(o.monto_estimado ?? 0),
    0,
  );
  const pipelinePonderado = activas.reduce(
    (a, o) => a + valorPonderado(o.monto_estimado, o.probabilidad),
    0,
  );
  const ganadoMonto = ganadas.reduce(
    (a, o) => a + Number(o.monto_estimado ?? 0),
    0,
  );
  const tasaConversion =
    ganadas.length + perdidas.length > 0
      ? (ganadas.length / (ganadas.length + perdidas.length)) * 100
      : 0;

  // Agrupar por etapa para Kanban
  const porEtapa = new Map<EstadoOportunidad, typeof activas>();
  for (const e of ETAPAS_PIPELINE) {
    porEtapa.set(e, []);
  }
  for (const o of activas) {
    const arr = porEtapa.get(o.estado as EstadoOportunidad);
    if (arr) arr.push(o);
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Comercial</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Pipeline de Oportunidades
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Leads, oportunidades y ciclo de venta. Kanban por etapa con
            métricas en vivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton tipo="oportunidades" />
          <Link href="/comercial/oportunidades/nueva">
            <Button>
              <Plus className="h-4 w-4" />
              Nueva oportunidad
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pipeline activo"
          value={fmtMxnShort.format(pipelineMonto)}
          sub={`${activas.length} oportunidades`}
          accent="brand"
        />
        <KpiCard
          label="Valor ponderado"
          value={fmtMxnShort.format(pipelinePonderado)}
          sub="Monto × probabilidad"
          accent="ok"
        />
        <KpiCard
          label="Ganadas (90d)"
          value={fmtMxnShort.format(ganadoMonto)}
          sub={`${ganadas.length} cerradas · ${tasaConversion.toFixed(0)}% conversión`}
          accent="ok"
        />
        <KpiCard
          label="Perdidas (90d)"
          value={String(perdidas.length)}
          sub={`${(perdidas.length / Math.max(1, ganadas.length + perdidas.length) * 100).toFixed(0)}% del cierre`}
          accent={perdidas.length > 0 ? "warn" : "brand"}
        />
      </div>

      {/* Filtros + toggle vista */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 shadow-xs">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 mr-2">
          Empresa
        </span>
        <Link
          href={`/comercial/oportunidades${vista !== "kanban" ? `?vista=${vista}` : ""}`}
          className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${!empresaFiltro ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
        >
          Todas
        </Link>
        {(empresas ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/comercial/oportunidades?empresa=${e.id}${vista !== "kanban" ? `&vista=${vista}` : ""}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium ${empresaFiltro === e.id ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"} ${empresaFiltro === e.id ? "bg-white" : ""}`}
            />
            {e.codigo}
          </Link>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
          <Link
            href={`/comercial/oportunidades${empresaFiltro ? `?empresa=${empresaFiltro}` : ""}`}
            className={`rounded px-2 py-0.5 text-[11px] font-medium ${vista === "kanban" ? "bg-brand text-brand-fg" : "text-ink-3 hover:text-ink-1"}`}
          >
            Kanban
          </Link>
          <Link
            href={`/comercial/oportunidades?vista=tabla${empresaFiltro ? `&empresa=${empresaFiltro}` : ""}`}
            className={`rounded px-2 py-0.5 text-[11px] font-medium ${vista === "tabla" ? "bg-brand text-brand-fg" : "text-ink-3 hover:text-ink-1"}`}
          >
            Tabla
          </Link>
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Error: {error.message}
        </div>
      )}

      {vista === "kanban" ? (
        <KanbanPipeline
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          oportunidades={lista as any[]}
          puedeEditar={puedeEditarPipeline}
        />
      ) : (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-bg-2 text-left">
              <tr>
                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  Empresa
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  Oportunidad
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  Cliente
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  Estado
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  Fuente
                </th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  Monto
                </th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  Prob.
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  Próxima acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-ink-3">
                    Sin oportunidades capturadas.
                    <br />
                    <Link
                      href="/comercial/oportunidades/nueva"
                      className="mt-2 inline-block text-brand hover:underline"
                    >
                      Capturar la primera →
                    </Link>
                  </td>
                </tr>
              ) : (
                lista.map((o) => {
                  const cli = o.clientes as
                    | { razon_social: string; nombre_comercial: string | null }
                    | null;
                  const emp = o.empresas as { codigo: string } | null;
                  return (
                    <tr key={o.id} className="hover:bg-bg-2">
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${empresaCodigoColor[emp?.codigo ?? ""] ?? "bg-muted-foreground"}`}
                          />
                          {emp?.codigo ?? "?"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/comercial/oportunidades/${o.id}`}
                          className="font-medium hover:text-brand hover:underline"
                        >
                          {o.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-ink-3">
                        {cli?.nombre_comercial ?? cli?.razon_social ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_OPORTUNIDAD[o.estado as EstadoOportunidad] ?? "bg-gray-100"}`}
                        >
                          {ETIQUETA_ESTADO_OPORTUNIDAD[
                            o.estado as EstadoOportunidad
                          ] ?? o.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-ink-3">
                        {o.fuente
                          ? ETIQUETA_FUENTE[o.fuente as FuenteOportunidad] ??
                            (o.fuente as string)
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tnum">
                        {o.monto_estimado
                          ? fmtMxn.format(Number(o.monto_estimado))
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tnum">
                        {o.probabilidad
                          ? `${Math.round(Number(o.probabilidad) * 100)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[11px]">
                        {o.fecha_proxima_accion
                          ? new Date(
                              o.fecha_proxima_accion as string,
                            ).toLocaleDateString("es-MX", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                        {o.proxima_accion && (
                          <p className="text-ink-3">
                            {o.proxima_accion as string}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Métricas adicionales abajo */}
      {ganadas.length > 0 && (
        <div className="mt-6 rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <h3 className="text-[13.5px] font-semibold">
              Resultados últimos 90 días
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-ink-3">
                Ganadas
              </p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-emerald-700">
                {ganadas.length}
              </p>
              <p className="text-[11px] text-ink-3">
                {fmtMxn.format(ganadoMonto)}
              </p>
            </div>
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-ink-3">
                Perdidas
              </p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-red-700">
                {perdidas.length}
              </p>
              <p className="text-[11px] text-ink-3">
                {fmtMxn.format(
                  perdidas.reduce(
                    (a, o) => a + Number(o.monto_estimado ?? 0),
                    0,
                  ),
                )}
              </p>
            </div>
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-ink-3">
                Tasa conversión
              </p>
              <p className="mt-0.5 font-mono text-lg font-semibold">
                {tasaConversion.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-ink-3">
                Ticket promedio
              </p>
              <p className="mt-0.5 font-mono text-lg font-semibold">
                {fmtMxn.format(
                  ganadas.length > 0 ? ganadoMonto / ganadas.length : 0,
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
