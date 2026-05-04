import { AlertTriangle, CheckCircle2, Circle, Clock, FileText } from "lucide-react";
import Link from "next/link";

import { KpiCard } from "@/components/ui/kpi-card";
import { obtenerVinculos } from "@/lib/auth/permisos";
import { MESES_ES } from "@/lib/efm/state";
import { createClient } from "@/lib/supabase/server";

import { CumplimientoCharts } from "./cumplimiento-charts";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const SEMAFORO_LABEL: Record<string, string> = {
  verde: "Completo",
  verde_parcial: "Obligaciones OK",
  amarillo: "Pendiente",
  rojo: "Fuera de plazo",
  efm_solo: "Solo EFM",
  gris: "Sin datos",
};

const SEMAFORO_COLOR: Record<string, string> = {
  verde: "bg-emerald-500",
  verde_parcial: "bg-emerald-300",
  amarillo: "bg-amber-400",
  rojo: "bg-red-500",
  efm_solo: "bg-blue-300",
  gris: "bg-zinc-200",
};

const SEMAFORO_BORDER: Record<string, string> = {
  verde: "border-emerald-500",
  verde_parcial: "border-emerald-300",
  amarillo: "border-amber-400",
  rojo: "border-red-500",
  efm_solo: "border-blue-300",
  gris: "border-zinc-200",
};

type CumplimientoRow = {
  empresa_id: string;
  empresa_codigo: string;
  anio: number;
  mes: number;
  total_obligaciones: number;
  obligaciones_completadas: number;
  obligaciones_fuera_plazo: number;
  obligaciones_pagadas: number;
  total_pagado_sat: number;
  efm_id: string | null;
  efm_completo: boolean;
  efm_firmados: boolean;
  utilidad_neta: number | null;
  ingresos_totales: number | null;
  egresos_totales: number | null;
  iva_trasladado: number | null;
  iva_acreditable: number | null;
  flujo_efectivo: number | null;
  semaforo: string;
};

type SearchParams = {
  empresa?: string;
  anio?: string;
  tab?: "obligaciones" | "efm" | "ejecutiva";
};

export default async function CumplimientoPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  await obtenerVinculos();

  const sp = searchParams ?? {};
  const empresaId = sp.empresa ?? "";
  const anio = sp.anio ? parseInt(sp.anio, 10) : new Date().getFullYear();
  const tab = sp.tab ?? "ejecutiva";

  // v_cumplimiento_mensual es una vista nueva (migración 20260522000000),
  // todavía no está en types regenerados — cast minimal y typamos después.
  let query = supabase
    .from("v_cumplimiento_mensual")
    .select("*")
    .eq("anio", anio)
    .order("mes", { ascending: true });
  if (empresaId) query = query.eq("empresa_id", empresaId);

  const { data: rows } = (await query) as {
    data: Array<Record<string, unknown>> | null;
  };
  const lista = ((rows ?? []) as Array<Record<string, unknown>>).map(
    (r) => r as unknown as CumplimientoRow,
  );

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial, razon_social")
    .eq("activa", true)
    .order("codigo");

  // Aggregations año
  const totalObligaciones = lista.reduce(
    (a, r) => a + Number(r.total_obligaciones ?? 0),
    0,
  );
  const totalCompletadas = lista.reduce(
    (a, r) => a + Number(r.obligaciones_completadas ?? 0),
    0,
  );
  const totalFueraPlazo = lista.reduce(
    (a, r) => a + Number(r.obligaciones_fuera_plazo ?? 0),
    0,
  );
  const totalPagado = lista.reduce(
    (a, r) => a + Number(r.total_pagado_sat ?? 0),
    0,
  );
  const totalIngresos = lista.reduce(
    (a, r) => a + Number(r.ingresos_totales ?? 0),
    0,
  );
  const totalEgresos = lista.reduce(
    (a, r) => a + Number(r.egresos_totales ?? 0),
    0,
  );
  const utilidadAcum = lista.reduce(
    (a, r) => a + Number(r.utilidad_neta ?? 0),
    0,
  );
  const margen = totalIngresos > 0 ? (utilidadAcum / totalIngresos) * 100 : 0;

  // Build calendar (12 meses) — combinando todas las empresas si no hay filtro
  type CeldaMes = {
    mes: number;
    pendientes: number;
    presentadas: number;
    fueraPlazo: number;
    semaforo: string;
    efmId: string | null;
  };
  const calendario: CeldaMes[] = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const filasMes = lista.filter((r) => r.mes === mes);
    const pendientes = filasMes.reduce(
      (a, r) =>
        a +
        Number(r.total_obligaciones ?? 0) -
        Number(r.obligaciones_completadas ?? 0),
      0,
    );
    const presentadas = filasMes.reduce(
      (a, r) => a + Number(r.obligaciones_completadas ?? 0),
      0,
    );
    const fueraPlazo = filasMes.reduce(
      (a, r) => a + Number(r.obligaciones_fuera_plazo ?? 0),
      0,
    );
    let semaforo = "gris";
    if (fueraPlazo > 0) semaforo = "rojo";
    else if (pendientes > 0) semaforo = "amarillo";
    else if (presentadas > 0) semaforo = "verde";
    const efmId =
      filasMes.find((r) => r.efm_id !== null)?.efm_id ?? null;
    return {
      mes,
      pendientes,
      presentadas,
      fueraPlazo,
      semaforo,
      efmId,
    };
  });

  // Próximas a vencer (next 30 days)
  const hoy30 = new Date();
  const en30dias = new Date();
  en30dias.setDate(en30dias.getDate() + 30);
  const { data: proximas } = await supabase
    .from("v_obligaciones_lista")
    .select("id, empresa_codigo, tipo, periodo_label, fecha_vencimiento, monto_calculado")
    .gte("fecha_vencimiento", hoy30.toISOString().slice(0, 10))
    .lte("fecha_vencimiento", en30dias.toISOString().slice(0, 10))
    .in("estado_efectivo", ["pendiente", "en_proceso"])
    .order("fecha_vencimiento", { ascending: true })
    .limit(10);

  const tabActiva = tab;
  const linkBase = (newTab: string) => {
    const params = new URLSearchParams();
    if (empresaId) params.set("empresa", empresaId);
    if (anio !== new Date().getFullYear()) params.set("anio", String(anio));
    params.set("tab", newTab);
    return `/finanzas/cumplimiento?${params.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6">
        <p className="lbl-mini">Administración y Finanzas</p>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Cumplimiento fiscal {anio}
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Vista unificada de obligaciones SAT y estados financieros mensuales
          del grupo.
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 shadow-xs">
        <span className="mr-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Año
        </span>
        {[anio - 2, anio - 1, anio, anio + 1].map((a) => (
          <Link
            key={a}
            href={`/finanzas/cumplimiento?anio=${a}${empresaId ? `&empresa=${empresaId}` : ""}&tab=${tabActiva}`}
            className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${
              anio === a
                ? "bg-brand text-brand-fg"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3"
            }`}
          >
            {a}
          </Link>
        ))}
        <span className="mx-2 text-ink-5">·</span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Empresa
        </span>
        <Link
          href={`/finanzas/cumplimiento?anio=${anio}&tab=${tabActiva}`}
          className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${
            !empresaId
              ? "bg-brand text-brand-fg"
              : "bg-bg-2 text-ink-2 hover:bg-bg-3"
          }`}
        >
          Todas
        </Link>
        {(empresas ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/finanzas/cumplimiento?anio=${anio}&empresa=${e.id}&tab=${tabActiva}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium ${
              empresaId === e.id
                ? "bg-brand text-brand-fg"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3"
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
              } ${empresaId === e.id ? "bg-white" : ""}`}
            />
            {e.codigo}
          </Link>
        ))}
      </div>

      {/* Tabs */}
      <nav
        aria-label="Pestañas de cumplimiento"
        className="mb-5 flex flex-wrap items-center gap-1 border-b border-border"
      >
        {(
          [
            { k: "ejecutiva", label: "Vista ejecutiva" },
            { k: "obligaciones", label: "Obligaciones SAT" },
            { k: "efm", label: "Estados Financieros" },
          ] as const
        ).map((t) => (
          <Link
            key={t.k}
            href={linkBase(t.k)}
            aria-current={tabActiva === t.k ? "page" : undefined}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
              tabActiva === t.k
                ? "border-brand text-brand"
                : "border-transparent text-ink-3 hover:border-divider hover:text-ink-1"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Tab: Obligaciones SAT */}
      {tabActiva === "obligaciones" && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total obligaciones"
              value={String(totalObligaciones)}
              sub={`${totalCompletadas} completadas`}
            />
            <KpiCard
              label="Cumplimiento"
              value={
                totalObligaciones > 0
                  ? `${Math.round((totalCompletadas / totalObligaciones) * 100)}%`
                  : "—"
              }
              accent={
                totalCompletadas === totalObligaciones && totalObligaciones > 0
                  ? "ok"
                  : totalFueraPlazo > 0
                    ? "danger"
                    : "warn"
              }
            />
            <KpiCard
              label="Fuera de plazo"
              value={String(totalFueraPlazo)}
              accent={totalFueraPlazo > 0 ? "danger" : "ok"}
              sub={totalFueraPlazo > 0 ? "Atender" : "Al día"}
            />
            <KpiCard
              label="Total pagado"
              value={fmtMxn.format(totalPagado)}
              sub="Acumulado año"
            />
          </div>

          {/* Grid 12 meses */}
          <h2 className="mb-3 text-base font-semibold">Calendario {anio}</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {calendario.map((c) => {
              const params = new URLSearchParams();
              if (empresaId) params.set("empresa", empresaId);
              params.set("anio", String(anio));
              params.set("periodo_mes", String(c.mes));
              return (
                <Link
                  key={c.mes}
                  href={`/finanzas/obligaciones?${params.toString()}`}
                  className={`block rounded-md border-2 ${SEMAFORO_BORDER[c.semaforo]} bg-card p-3 hover:bg-bg-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold">
                      {MESES_ES[c.mes - 1]}
                    </span>
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${SEMAFORO_COLOR[c.semaforo]}`}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-ink-3">
                    {c.presentadas}/{c.presentadas + c.pendientes}
                  </p>
                  {c.fueraPlazo > 0 && (
                    <p className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-red-700">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {c.fueraPlazo} fuera plazo
                    </p>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Próximas a vencer */}
          {(proximas ?? []).length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-base font-semibold">
                Próximas 30 días
              </h2>
              <div className="space-y-1.5">
                {(proximas ?? []).map((p) => (
                  <Link
                    key={p.id as string}
                    href={`/finanzas/obligaciones/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-2 hover:bg-bg-2"
                  >
                    <div className="flex items-center gap-3 text-[12.5px]">
                      <Clock className="h-3.5 w-3.5 text-ink-3" />
                      <span className="font-medium">
                        {p.empresa_codigo as string}
                      </span>
                      <span>·</span>
                      <span>{p.tipo as string}</span>
                      <span className="text-ink-3">
                        {p.periodo_label as string}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11.5px]">
                      <span className="text-ink-3">
                        {new Date(
                          p.fecha_vencimiento as string,
                        ).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {p.monto_calculado != null && (
                        <span className="font-mono">
                          {fmtMxn.format(Number(p.monto_calculado))}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Tab: Estados Financieros */}
      {tabActiva === "efm" && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Ingresos acum."
              value={fmtMxn.format(totalIngresos)}
            />
            <KpiCard
              label="Egresos acum."
              value={fmtMxn.format(totalEgresos)}
            />
            <KpiCard
              label="Utilidad neta acum."
              value={fmtMxn.format(utilidadAcum)}
              accent={utilidadAcum >= 0 ? "ok" : "danger"}
            />
            <KpiCard
              label="Margen"
              value={`${margen.toFixed(1)}%`}
              accent={margen >= 10 ? "ok" : margen >= 0 ? "warn" : "danger"}
            />
          </div>

          {/* Charts */}
          <CumplimientoCharts
            data={lista.map((r) => ({
              mes: r.mes,
              utilidad: Number(r.utilidad_neta ?? 0),
              ingresos: Number(r.ingresos_totales ?? 0),
              egresos: Number(r.egresos_totales ?? 0),
              iva_trasladado: Number(r.iva_trasladado ?? 0),
              iva_acreditable: Number(r.iva_acreditable ?? 0),
            }))}
          />

          {/* Tabla resumen mensual */}
          <h2 className="mb-3 mt-8 text-base font-semibold">
            Resumen mensual
          </h2>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-[12.5px]">
              <thead className="bg-bg-2 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10.5px] text-ink-3">
                    Mes
                  </th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10.5px] text-ink-3 text-center">
                    Paquete
                  </th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10.5px] text-ink-3 text-center">
                    Firmado
                  </th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10.5px] text-ink-3 text-right">
                    Ingresos
                  </th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10.5px] text-ink-3 text-right">
                    Utilidad
                  </th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[10.5px] text-ink-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const r = lista.find((row) => row.mes === m);
                  return (
                    <tr key={m} className="hover:bg-bg-2/40">
                      <td className="px-3 py-2 font-medium">
                        {MESES_ES[m - 1]}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r?.efm_completo ? (
                          <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-emerald-700" />
                        ) : r?.efm_id ? (
                          <Circle className="mx-auto h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <span className="text-ink-4">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r?.efm_firmados ? (
                          <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-blue-700" />
                        ) : (
                          <span className="text-ink-4">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {r?.ingresos_totales != null
                          ? fmtMxn.format(Number(r.ingresos_totales))
                          : "—"}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono ${
                          r?.utilidad_neta != null && Number(r.utilidad_neta) < 0
                            ? "text-red-700"
                            : ""
                        }`}
                      >
                        {r?.utilidad_neta != null
                          ? fmtMxn.format(Number(r.utilidad_neta))
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r?.efm_id && (
                          <Link
                            href={`/finanzas/estados-financieros/${r.efm_id}`}
                            className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline"
                          >
                            <FileText className="h-3 w-3" />
                            Ver
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab: Vista ejecutiva */}
      {tabActiva === "ejecutiva" && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Cumplimiento SAT"
              value={
                totalObligaciones > 0
                  ? `${Math.round((totalCompletadas / totalObligaciones) * 100)}%`
                  : "—"
              }
              sub={`${totalCompletadas}/${totalObligaciones}`}
              accent={
                totalCompletadas === totalObligaciones && totalObligaciones > 0
                  ? "ok"
                  : totalFueraPlazo > 0
                    ? "danger"
                    : "warn"
              }
            />
            <KpiCard
              label="Pagado SAT"
              value={fmtMxn.format(totalPagado)}
              sub="Acumulado año"
            />
            <KpiCard
              label="Utilidad acum."
              value={fmtMxn.format(utilidadAcum)}
              accent={utilidadAcum >= 0 ? "ok" : "danger"}
            />
            <KpiCard
              label="Fuera de plazo"
              value={String(totalFueraPlazo)}
              accent={totalFueraPlazo > 0 ? "danger" : "ok"}
            />
          </div>

          <h2 className="mb-3 text-base font-semibold">
            Calendario combinado {anio}
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {calendario.map((c) => (
              <div
                key={c.mes}
                className={`rounded-md border-2 ${SEMAFORO_BORDER[c.semaforo]} bg-card p-3`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold">
                    {MESES_ES[c.mes - 1]}
                  </span>
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${SEMAFORO_COLOR[c.semaforo]}`}
                    title={SEMAFORO_LABEL[c.semaforo]}
                  />
                </div>
                <p className="mt-1 font-mono text-[11px] text-ink-3">
                  Oblig: {c.presentadas}/{c.presentadas + c.pendientes}
                </p>
                <p className="font-mono text-[11px] text-ink-3">
                  EFM: {c.efmId ? "✓" : "—"}
                </p>
              </div>
            ))}
          </div>

          {totalFueraPlazo > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-base font-semibold text-red-700">
                Alertas
              </h2>
              <div className="rounded-md border border-red-300 bg-red-50 p-3">
                <p className="text-[12.5px] font-medium text-red-900">
                  {totalFueraPlazo} obligación
                  {totalFueraPlazo !== 1 ? "es" : ""} fuera de plazo
                </p>
                <Link
                  href={`/finanzas/obligaciones?anio=${anio}&estado=fuera_plazo${empresaId ? `&empresa=${empresaId}` : ""}`}
                  className="mt-1 inline-flex text-[11.5px] text-red-800 underline"
                >
                  Ver detalles
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
