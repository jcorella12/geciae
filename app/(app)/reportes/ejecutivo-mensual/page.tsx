import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  CreditCard,
  Receipt,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { Stat } from "@/components/ui/stat";
import { StatusDot } from "@/components/ui/status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

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
  maximumFractionDigits: 0,
});
const fmtPct = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type SearchParams = { mes?: string; empresa?: string };

export default async function ReporteEjecutivoMensualPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const esEjecutivo =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    tieneAtributo(v, "aprobador_financiero");

  if (!esEjecutivo) {
    return (
      <div className="mx-auto w-full max-w-2xl px-8 py-12 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-ink-4" />
        <h1 className="mt-4 text-xl font-semibold">Sin acceso</h1>
        <p className="mt-2 text-[13px] text-ink-3">
          El reporte ejecutivo es visible solo para CEO, tesorero corporativo o
          aprobador financiero.
        </p>
      </div>
    );
  }

  const ahora = new Date();
  const mesParam =
    searchParams?.mes ??
    `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = mesParam.split("-").map(Number);
  const empresaFiltro = searchParams?.empresa ?? "";

  const desde = `${year}-${String(month).padStart(2, "0")}-01`;
  const hastaDate = new Date(year, month, 1);
  const hastaStr = hastaDate.toISOString().slice(0, 10);

  // Mismo periodo del año anterior para comparativos
  const yearAnterior = year - 1;
  const desdeAnt = `${yearAnterior}-${String(month).padStart(2, "0")}-01`;
  const hastaAnt = new Date(yearAnterior, month, 1).toISOString().slice(0, 10);

  // Mes anterior para navegación
  const prevMes = (() => {
    const d = new Date(year, month - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const nextMes = (() => {
    const d = new Date(year, month, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .eq("activa", true)
    .order("codigo");

  // Queries paralelas
  let cfdisQuery = supabase
    .from("cfdi")
    .select(
      "empresa_id, total, monto_pagado, saldo_pendiente, es_emitido, estado, rfc_emisor, nombre_emisor, rfc_receptor, nombre_receptor, fecha_emision",
    )
    .gte("fecha_emision", desde)
    .lt("fecha_emision", hastaStr)
    .neq("estado", "cancelado");

  let cfdisAntQuery = supabase
    .from("cfdi")
    .select("total, es_emitido")
    .gte("fecha_emision", desdeAnt)
    .lt("fecha_emision", hastaAnt)
    .neq("estado", "cancelado");

  if (empresaFiltro) {
    cfdisQuery = cfdisQuery.eq("empresa_id", empresaFiltro);
    cfdisAntQuery = cfdisAntQuery.eq("empresa_id", empresaFiltro);
  }

  const [
    { data: cfdis },
    { data: cfdisAnt },
    { data: bancos },
    { data: ocsPend },
    { data: repseAlertas },
  ] = await Promise.all([
    cfdisQuery,
    cfdisAntQuery,
    supabase
      .from("v_saldo_bancos_por_empresa")
      .select("*"),
    supabase
      .from("ordenes_compra")
      .select("total, fecha_emision, empresa_id, proveedores(razon_social)")
      .eq("estado", "pendiente_aprobacion"),
    supabase
      .from("v_repse_alertas")
      .select("nombre_completo, vigencia_repse_hasta, estado_repse, dias_para_vencer, empresa_id")
      .in("estado_repse", ["vencida", "urgente", "sin_constancia"])
      .limit(20),
  ]);

  const cfdisMes = cfdis ?? [];
  const cfdisMesAnt = cfdisAnt ?? [];

  // Totales del mes
  const ingresos = cfdisMes
    .filter((c) => c.es_emitido)
    .reduce((a, c) => a + Number(c.total ?? 0), 0);
  const egresos = cfdisMes
    .filter((c) => !c.es_emitido)
    .reduce((a, c) => a + Number(c.total ?? 0), 0);
  const margen = ingresos - egresos;
  const margenPct = ingresos > 0 ? (margen / ingresos) * 100 : 0;

  // Comparativo año anterior
  const ingresosAnt = cfdisMesAnt
    .filter((c) => c.es_emitido)
    .reduce((a, c) => a + Number(c.total ?? 0), 0);
  const egresosAnt = cfdisMesAnt
    .filter((c) => !c.es_emitido)
    .reduce((a, c) => a + Number(c.total ?? 0), 0);
  const deltaIngresos =
    ingresosAnt > 0 ? ((ingresos - ingresosAnt) / ingresosAnt) * 100 : 0;
  const deltaEgresos =
    egresosAnt > 0 ? ((egresos - egresosAnt) / egresosAnt) * 100 : 0;

  // CxC y CxP
  const cxc = cfdisMes
    .filter(
      (c) =>
        c.es_emitido &&
        c.estado === "timbrado" &&
        Number(c.saldo_pendiente ?? 0) > 0,
    )
    .reduce((a, c) => a + Number(c.saldo_pendiente ?? 0), 0);
  const cxp = cfdisMes
    .filter(
      (c) =>
        !c.es_emitido &&
        c.estado === "timbrado" &&
        Number(c.saldo_pendiente ?? 0) > 0,
    )
    .reduce((a, c) => a + Number(c.saldo_pendiente ?? 0), 0);

  // Top 10 proveedores
  type AggProv = { rfc: string; nombre: string; total: number; cantidad: number };
  const provMap = new Map<string, AggProv>();
  for (const c of cfdisMes.filter((c) => !c.es_emitido)) {
    const rfc = c.rfc_emisor;
    const g = provMap.get(rfc) ?? {
      rfc,
      nombre: c.nombre_emisor ?? rfc,
      total: 0,
      cantidad: 0,
    };
    g.total += Number(c.total ?? 0);
    g.cantidad += 1;
    provMap.set(rfc, g);
  }
  const topProveedores = Array.from(provMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Top 10 clientes
  type AggCli = { rfc: string; nombre: string; total: number; cantidad: number };
  const cliMap = new Map<string, AggCli>();
  for (const c of cfdisMes.filter((c) => c.es_emitido)) {
    const rfc = c.rfc_receptor;
    const g = cliMap.get(rfc) ?? {
      rfc,
      nombre: c.nombre_receptor ?? rfc,
      total: 0,
      cantidad: 0,
    };
    g.total += Number(c.total ?? 0);
    g.cantidad += 1;
    cliMap.set(rfc, g);
  }
  const topClientes = Array.from(cliMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Por empresa
  type AggEmp = {
    codigo: string;
    razon_social: string;
    ingresos: number;
    egresos: number;
    margen: number;
  };
  const empMap = new Map<string, AggEmp>();
  for (const e of empresas ?? []) {
    empMap.set(e.id, {
      codigo: e.codigo,
      razon_social: e.razon_social,
      ingresos: 0,
      egresos: 0,
      margen: 0,
    });
  }
  for (const c of cfdisMes) {
    const g = empMap.get(c.empresa_id);
    if (!g) continue;
    if (c.es_emitido) g.ingresos += Number(c.total ?? 0);
    else g.egresos += Number(c.total ?? 0);
    g.margen = g.ingresos - g.egresos;
  }

  // Bancos
  const totalBancos = (bancos ?? [])
    .filter(
      (b) => !empresaFiltro || b.empresa_id === empresaFiltro,
    )
    .reduce((a, b) => a + Number(b.saldo_total ?? 0), 0);

  // OC pendientes
  const ocsPendientes = (ocsPend ?? []).filter(
    (oc) => !empresaFiltro || oc.empresa_id === empresaFiltro,
  );
  const totalOcPend = ocsPendientes.reduce(
    (a, oc) => a + Number(oc.total ?? 0),
    0,
  );

  // REPSE
  const repseFilt = (repseAlertas ?? []).filter(
    (r) => !empresaFiltro || r.empresa_id === empresaFiltro,
  );

  const labelMes = `${MESES[month - 1]} ${year}`;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7 print:px-4 print:py-2">
      <div className="mb-7 flex items-end justify-between gap-4 print:mb-4">
        <div>
          <p className="lbl-mini">Reporte ejecutivo mensual</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em] capitalize">
            {labelMes}
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Resumen consolidado del grupo · vs mismo mes año anterior
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Link
            href={`/reportes/ejecutivo-mensual?mes=${prevMes}${empresaFiltro ? `&empresa=${empresaFiltro}` : ""}`}
          >
            <Button variant="outline" size="sm">
              ← {prevMes}
            </Button>
          </Link>
          <Link
            href={`/reportes/ejecutivo-mensual?mes=${nextMes}${empresaFiltro ? `&empresa=${empresaFiltro}` : ""}`}
          >
            <Button variant="outline" size="sm">
              {nextMes} →
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={undefined}
            asChild
          >
            <a href="javascript:window.print()">📄 Imprimir / PDF</a>
          </Button>
        </div>
      </div>

      {/* Filtro empresa */}
      <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Empresa
        </span>
        <Link href={`/reportes/ejecutivo-mensual?mes=${mesParam}`}>
          <button
            className={`rounded-md px-3 py-1 text-[12px] font-medium ${
              !empresaFiltro
                ? "bg-brand text-brand-fg"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3"
            }`}
          >
            Consolidado grupo
          </button>
        </Link>
        {(empresas ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/reportes/ejecutivo-mensual?mes=${mesParam}&empresa=${e.id}`}
          >
            <button
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-medium ${
                empresaFiltro === e.id
                  ? "bg-brand text-brand-fg"
                  : "bg-bg-2 text-ink-2 hover:bg-bg-3"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  empresaCodigoColor[e.codigo] ?? "bg-muted"
                } ${empresaFiltro === e.id ? "bg-white" : ""}`}
              />
              {e.codigo}
            </button>
          </Link>
        ))}
      </div>

      {/* KPIs principales */}
      <section className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-3">
        <KpiCard
          label="Ingresos del mes"
          value={fmtMxn.format(ingresos)}
          delta={
            ingresosAnt > 0
              ? {
                  dir:
                    deltaIngresos > 0
                      ? "up"
                      : deltaIngresos < 0
                        ? "down"
                        : "flat",
                  text: fmtPct(deltaIngresos) + " vs año anterior",
                }
              : undefined
          }
          accent="ok"
        />
        <KpiCard
          label="Egresos del mes"
          value={fmtMxn.format(egresos)}
          delta={
            egresosAnt > 0
              ? {
                  dir:
                    deltaEgresos > 0
                      ? "up"
                      : deltaEgresos < 0
                        ? "down"
                        : "flat",
                  text: fmtPct(deltaEgresos) + " vs año anterior",
                }
              : undefined
          }
          accent="warn"
        />
        <KpiCard
          label="Margen"
          value={fmtMxn.format(margen)}
          sub={`${margenPct.toFixed(1)}% sobre ingresos`}
          accent={margen >= 0 ? "ok" : "danger"}
        />
        <KpiCard
          label="Cash en bancos"
          value={fmtMxn.format(totalBancos)}
          sub="Liquidez actual"
        />
      </section>

      {/* Resumen por empresa */}
      {!empresaFiltro && (
        <section className="mb-6 rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-ink-3" />
            <h2 className="text-[14px] font-semibold">Por empresa</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Empresa</TableHead>
                <TableHead align="right">Ingresos</TableHead>
                <TableHead align="right">Egresos</TableHead>
                <TableHead align="right">Margen</TableHead>
                <TableHead align="right">% margen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(empMap.entries()).map(([id, g]) => {
                const pct = g.ingresos > 0 ? (g.margen / g.ingresos) * 100 : 0;
                return (
                  <TableRow key={id}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            empresaCodigoColor[g.codigo] ?? "bg-muted"
                          }`}
                        />
                        <span className="font-medium">{g.codigo}</span>
                        <span className="text-ink-3">{g.razon_social}</span>
                      </span>
                    </TableCell>
                    <TableCell align="right" mono>
                      {fmtMxn.format(g.ingresos)}
                    </TableCell>
                    <TableCell align="right" mono>
                      {fmtMxn.format(g.egresos)}
                    </TableCell>
                    <TableCell align="right" mono>
                      <span
                        className={
                          g.margen >= 0
                            ? "text-ok-deep font-medium"
                            : "text-danger-deep font-medium"
                        }
                      >
                        {fmtMxn.format(g.margen)}
                      </span>
                    </TableCell>
                    <TableCell align="right" mono>
                      {pct.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}

      {/* Top proveedores y clientes en 2 columnas */}
      <div className="mb-6 grid gap-5 lg:grid-cols-2 print:grid-cols-2">
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-warn-deep" />
            <h2 className="text-[14px] font-semibold">Top 10 proveedores</h2>
          </div>
          {topProveedores.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-ink-3">
              Sin gastos registrados.
            </p>
          ) : (
            <ul className="space-y-2">
              {topProveedores.map((p, i) => {
                const pct = egresos > 0 ? (p.total / egresos) * 100 : 0;
                return (
                  <li key={p.rfc} className="flex items-center gap-3">
                    <span className="w-5 text-right font-mono text-[10px] text-ink-3">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="truncate font-medium">{p.nombre}</span>
                        <span className="font-mono tnum text-[12px]">
                          {fmtMxn.format(p.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-3">
                          <div
                            className="h-full bg-warn"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-ink-3 tnum">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-ink-3">
                        {p.rfc} · {p.cantidad} CFDIs
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4 text-ok-deep" />
            <h2 className="text-[14px] font-semibold">Top 10 clientes</h2>
          </div>
          {topClientes.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-ink-3">
              Sin facturación registrada.
            </p>
          ) : (
            <ul className="space-y-2">
              {topClientes.map((c, i) => {
                const pct = ingresos > 0 ? (c.total / ingresos) * 100 : 0;
                return (
                  <li key={c.rfc} className="flex items-center gap-3">
                    <span className="w-5 text-right font-mono text-[10px] text-ink-3">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="truncate font-medium">{c.nombre}</span>
                        <span className="font-mono tnum text-[12px]">
                          {fmtMxn.format(c.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-3">
                          <div
                            className="h-full bg-ok"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-ink-3 tnum">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-ink-3">
                        {c.rfc} · {c.cantidad} CFDIs
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Pendientes */}
      <div className="mb-6 grid gap-5 lg:grid-cols-3 print:grid-cols-3">
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-warn-deep" />
            <h2 className="text-[14px] font-semibold">Cuentas por cobrar</h2>
          </div>
          <Stat
            label="Pendiente al cierre"
            value={fmtMxn.format(cxc)}
            color={cxc > 0 ? "var(--warn-deep)" : "var(--ok-deep)"}
          />
          <p className="mt-2 text-[11.5px] text-ink-3">
            Facturas timbradas con saldo &gt; 0 emitidas en el mes.
          </p>
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-danger-deep" />
            <h2 className="text-[14px] font-semibold">Cuentas por pagar</h2>
          </div>
          <Stat
            label="Pendiente al cierre"
            value={fmtMxn.format(cxp)}
            color={cxp > 0 ? "var(--danger-deep)" : "var(--ok-deep)"}
          />
          <p className="mt-2 text-[11.5px] text-ink-3">
            CFDI recibidos del mes con saldo &gt; 0.
          </p>
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warn-deep" />
            <h2 className="text-[14px] font-semibold">OC sin aprobar</h2>
          </div>
          <Stat
            label="Comprometido"
            value={fmtMxn.format(totalOcPend)}
            sub={`${ocsPendientes.length} órdenes`}
          />
          <Link
            href="/finanzas/oc?estado=pendiente_aprobacion"
            className="mt-2 inline-block text-[11px] text-brand hover:underline print:hidden"
          >
            Ver lista →
          </Link>
        </section>
      </div>

      {/* Alertas REPSE */}
      {repseFilt.length > 0 && (
        <section className="mb-6 rounded-md border border-warn/40 bg-warn-soft/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-warn-deep" />
            <h2 className="text-[14px] font-semibold">
              Alertas REPSE — {repseFilt.length}
            </h2>
          </div>
          <ul className="space-y-1.5">
            {repseFilt.slice(0, 8).map((r, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-[12.5px]"
              >
                <StatusDot
                  status={
                    r.estado_repse === "vencida" ||
                    r.estado_repse === "sin_constancia"
                      ? "danger"
                      : "warning"
                  }
                />
                <span className="flex-1 font-medium">{r.nombre_completo}</span>
                <span className="text-[11px] text-ink-3">
                  {r.estado_repse === "sin_constancia"
                    ? "Sin constancia"
                    : r.estado_repse === "vencida"
                      ? `Vencida hace ${Math.abs(Number(r.dias_para_vencer ?? 0))} días`
                      : `Vence en ${r.dias_para_vencer} días`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer info */}
      <div className="mt-8 grid gap-3 text-[11px] text-ink-3 print:mt-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-3 w-3" /> Datos al cierre de{" "}
          {ahora.toLocaleString("es-MX", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-3 w-3" /> Todos los montos en pesos mexicanos
          (MXN). CFDI excluyen los cancelados.
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {margen >= 0 ? (
            <TrendingUp className="h-3 w-3 text-ok-deep" />
          ) : (
            <TrendingDown className="h-3 w-3 text-danger-deep" />
          )}
          {margenPct >= 15
            ? "Margen saludable (≥ 15%)."
            : margenPct >= 5
              ? "Margen aceptable (≥ 5%)."
              : margenPct >= 0
                ? "Margen bajo — revisar costos."
                : "MARGEN NEGATIVO — atención inmediata."}
        </div>
      </div>
    </div>
  );
}
