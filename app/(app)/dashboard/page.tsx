import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";

import {
  CashflowChart,
  CashflowLegend,
  type CashflowPoint,
} from "@/components/dashboard/cashflow-chart";
import { DraggableKpiGrid } from "@/components/dashboard/draggable-kpi-grid";
import { AlertItem } from "@/components/ui/alert-item";
import { Button } from "@/components/ui/button";
import { DualBar } from "@/components/ui/dual-bar";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiFeature } from "@/components/ui/kpi-feature";
import { Stat } from "@/components/ui/stat";
import { StatusDot, type StatusLevel } from "@/components/ui/status-dot";
import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
  VISTA_CONSOLIDADA,
} from "@/lib/empresa-activa";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard ejecutivo" };

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

function avanceFinanciero(p: {
  monto_contratado: number | null;
  monto_facturado: number | null;
}): number {
  const c = Number(p.monto_contratado ?? 0);
  const f = Number(p.monto_facturado ?? 0);
  if (c <= 0) return 0;
  return Math.round((f / c) * 100);
}

function avancePlan(p: {
  fecha_inicio_planeado: string | null;
  fecha_fin_planeado: string | null;
}): number {
  const ini = p.fecha_inicio_planeado;
  const fin = p.fecha_fin_planeado;
  if (!ini || !fin) return 0;
  const t0 = new Date(ini).getTime();
  const t1 = new Date(fin).getTime();
  const t = Date.now();
  if (t1 <= t0) return 0;
  if (t <= t0) return 0;
  if (t >= t1) return 100;
  return Math.round(((t - t0) / (t1 - t0)) * 100);
}

function semaforoToStatus(sem: string | null): StatusLevel {
  switch (sem) {
    case "rojo":
      return "danger";
    case "amarillo":
      return "warning";
    case "verde":
      return "ok";
    default:
      return "idle";
  }
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const puedeConsolidado = puedeVerConsolidado(
    v.map((vi) => ({ rol: vi.rol, atributos: vi.atributos })),
  );
  const empresasUser = v.map((vi) => vi.empresa_id);

  // Resolver filtro de empresas según cookie del switcher
  const cookieValue =
    cookies().get(EMPRESA_COOKIE)?.value ?? null;
  const filtro = resolverEmpresasFiltro({
    cookieValue,
    empresasUsuario: empresasUser,
    puedeConsolidado,
  });
  const verConsolidada = filtro.consolidada;
  const empresaActivaId = filtro.activaId;
  // Mantener referencia para silenciar lint (verConsolidada usado más abajo)
  void esCEO;
  void tieneAtributo;
  void VISTA_CONSOLIDADA;

  const [
    { data: empresas },
    { data: proyectos },
    { data: ocPendientes },
    { data: bancosSaldo },
    { data: cfdis },
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("proyectos")
      .select(
        `id, codigo, nombre, empresa_id, monto_contratado, monto_facturado, monto_cobrado, presupuesto_costo, costo_real, fecha_inicio_planeado, fecha_fin_planeado, estado, semaforo,
         clientes(razon_social, nombre_comercial),
         empresas!proyectos_empresa_id_fkey(codigo)`,
      )
      .in("estado", ["en_ejecucion", "planeacion", "en_cierre"])
      .order("monto_contratado", { ascending: false })
      .limit(20),
    supabase
      .from("ordenes_compra")
      .select("id, total, estado")
      .in("estado", ["pendiente_aprobacion"]),
    supabase.from("v_saldo_bancos_por_empresa").select("*"),
    supabase
      .from("cfdi")
      .select(
        "id, total, monto_pagado, saldo_pendiente, es_emitido, estado, empresa_id, fecha_emision",
      )
      .neq("estado", "cancelado")
      .gte(
        "fecha_emision",
        new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString(),
      ),
  ]);

  // Datos adicionales: crédito + inversión + obligaciones + cotizaciones + EFM + gastos recurrentes
  const [
    { data: cuentasFull },
    { data: obligaciones },
    { data: cotizs },
    { data: efmRecientes },
    { data: movsConcil },
    { data: gastosRec },
    { data: inventarioFull },
  ] = await Promise.all([
    supabase
      .from("v_bancos_cuentas_full")
      .select(
        "id, empresa_id, empresa_codigo, banco, alias, tipo, moneda, saldo_actual, linea_credito_monto_aprobado, linea_credito_dispuesto, linea_credito_disponible, linea_credito_proximo_pago_monto, linea_credito_proximo_pago_fecha, inversion_es_garantia",
      )
      .eq("activa", true),
    supabase
      .from("v_obligaciones_lista")
      .select(
        "id, empresa_id, empresa_codigo, tipo, periodo_label, fecha_vencimiento, dias_al_vencer, estado_efectivo, monto_calculado",
      )
      .in("estado_efectivo", ["pendiente", "fuera_plazo"])
      .lte("dias_al_vencer", 30)
      .order("fecha_vencimiento"),
    supabase
      .from("cotizaciones")
      .select("id, empresa_id, total, estado")
      .neq("estado", "convertida"),
    supabase
      .from("estados_financieros_mensuales")
      .select(
        "empresa_id, anio, mes, utilidad_neta, ingresos_totales, egresos_totales",
      )
      .order("anio", { ascending: false })
      .order("mes", { ascending: false })
      .limit(50),
    supabase
      .from("bancos_movimientos")
      .select("conciliado, fecha")
      .gte(
        "fecha",
        new Date(new Date().setDate(new Date().getDate() - 30))
          .toISOString()
          .slice(0, 10),
      ),
    supabase
      .from("v_gastos_recurrentes_lista")
      .select(
        "id, empresa_id, empresa_codigo, categoria, descripcion, monto, monto_mensualizado, frecuencia",
      )
      .eq("activo", true),
    supabase
      .from("v_inventario_stock")
      .select(
        "producto_id, empresa_id, sku, nombre, categoria, stock_actual, costo_promedio, valor_mercado, valor_costo, valor_mercado_total, estado_stock, unidad_medida",
      ),
  ]);

  // Filtrado por empresas visibles — respeta el switcher del topbar
  const empresasVisibles = filtro.empresasIds;

  // Cálculos adicionales (después de empresasVisibles para que pueda usarlo)
  const cuentasArr = (cuentasFull ?? []) as Array<Record<string, unknown>>;
  const cuentasVisibles = cuentasArr.filter((c) =>
    empresasVisibles.includes(c.empresa_id as string),
  );
  const creditoDispuesto = cuentasVisibles
    .filter((c) => c.tipo === "credito")
    .reduce((a, c) => a + Number(c.linea_credito_dispuesto ?? 0), 0);
  const creditoDisponible = cuentasVisibles
    .filter((c) => c.tipo === "credito")
    .reduce((a, c) => a + Number(c.linea_credito_disponible ?? 0), 0);
  const inversionTotal = cuentasVisibles
    .filter((c) => c.tipo === "inversion")
    .reduce((a, c) => a + Number(c.saldo_actual ?? 0), 0);

  const obligaciones7d = (obligaciones ?? []).filter(
    (o: Record<string, unknown>) => Number(o.dias_al_vencer ?? 999) <= 7,
  );
  const obligacionesFueraPlazo = (obligaciones ?? []).filter(
    (o: Record<string, unknown>) => o.estado_efectivo === "fuera_plazo",
  );

  const cotizsArr = (cotizs ?? []) as Array<Record<string, unknown>>;
  const cotizsVisibles = cotizsArr.filter((c) =>
    empresasVisibles.includes(c.empresa_id as string),
  );
  const cotizsBorrador = cotizsVisibles.filter((c) => c.estado === "borrador");
  const cotizsEnviadas = cotizsVisibles.filter((c) => c.estado === "enviada");
  const cotizsAceptadas = cotizsVisibles.filter((c) => c.estado === "aceptada");
  const cotizPipeline =
    cotizsBorrador.reduce((a, c) => a + Number(c.total ?? 0), 0) +
    cotizsEnviadas.reduce((a, c) => a + Number(c.total ?? 0), 0);

  // Última utilidad neta del grupo (suma del último mes común)
  const efmArr = (efmRecientes ?? []) as Array<Record<string, unknown>>;
  let utilidadUltimoMes = 0;
  let etiquetaUltimoMes = "";
  if (efmArr.length > 0) {
    const mostRecent = efmArr[0];
    const año = mostRecent.anio as number;
    const mes = mostRecent.mes as number;
    utilidadUltimoMes = efmArr
      .filter(
        (e) =>
          e.anio === año &&
          e.mes === mes &&
          empresasVisibles.includes(e.empresa_id as string),
      )
      .reduce((a, e) => a + Number(e.utilidad_neta ?? 0), 0);
    const MESES_LBL = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ];
    etiquetaUltimoMes = `${MESES_LBL[mes - 1]} ${año}`;
  }

  const movsArr = (movsConcil ?? []) as Array<Record<string, unknown>>;
  const totalMovs30d = movsArr.length;
  const movsConciliados30d = movsArr.filter((m) => m.conciliado).length;
  const pctConciliacion30d =
    totalMovs30d > 0 ? (movsConciliados30d / totalMovs30d) * 100 : 0;

  const gastosArr = (gastosRec ?? []) as Array<Record<string, unknown>>;
  const gastosVisibles = gastosArr.filter((g) =>
    empresasVisibles.includes(g.empresa_id as string),
  );
  const indirectosMensual = gastosVisibles.reduce(
    (a, g) => a + Number(g.monto_mensualizado ?? 0),
    0,
  );
  const proyectosVisibles = (proyectos ?? []).filter((p) =>
    empresasVisibles.includes(p.empresa_id),
  );
  const cfdisVisibles = (cfdis ?? []).filter((c) =>
    empresasVisibles.includes(c.empresa_id),
  );

  // Inventario consolidado
  type InventarioRow = {
    producto_id: string;
    empresa_id: string;
    sku: string;
    nombre: string;
    categoria: string;
    stock_actual: number;
    costo_promedio: number | null;
    valor_mercado: number | null;
    valor_costo: number;
    valor_mercado_total: number;
    estado_stock: "agotado" | "bajo" | "normal";
    unidad_medida: string | null;
  };
  const inventarioVisible = (
    (inventarioFull ?? []) as InventarioRow[]
  ).filter((i) => empresasVisibles.includes(i.empresa_id));
  const invValorCosto = inventarioVisible.reduce(
    (a, i) => a + Number(i.valor_costo ?? 0),
    0,
  );
  const invValorMercado = inventarioVisible.reduce(
    (a, i) => a + Number(i.valor_mercado_total ?? 0),
    0,
  );
  const invItemsTotal = inventarioVisible.length;
  const invItemsAlerta = inventarioVisible.filter(
    (i) => i.estado_stock === "agotado" || i.estado_stock === "bajo",
  ).length;
  const invDeltaPct =
    invValorCosto > 0
      ? ((invValorMercado - invValorCosto) / invValorCosto) * 100
      : 0;

  // Top items por valor
  const invTopItems = [...inventarioVisible]
    .sort(
      (a, b) =>
        Number(b.valor_mercado_total ?? 0) - Number(a.valor_mercado_total ?? 0),
    )
    .slice(0, 5);

  // KPIs consolidados
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  // Cashflow 6 meses
  const MESES_CORTO = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  const cashflowData: CashflowPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const dNext = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 1);
    const ingresos = cfdisVisibles
      .filter(
        (c) =>
          c.es_emitido &&
          c.fecha_emision &&
          new Date(c.fecha_emision) >= d &&
          new Date(c.fecha_emision) < dNext,
      )
      .reduce((acc, c) => acc + Number(c.total ?? 0), 0);
    const egresos = cfdisVisibles
      .filter(
        (c) =>
          !c.es_emitido &&
          c.fecha_emision &&
          new Date(c.fecha_emision) >= d &&
          new Date(c.fecha_emision) < dNext,
      )
      .reduce((acc, c) => acc + Number(c.total ?? 0), 0);
    cashflowData.push({
      mes: MESES_CORTO[d.getMonth()],
      ingresos,
      egresos,
      margen: ingresos - egresos,
    });
  }

  const ingresosMes = cfdisVisibles
    .filter(
      (c) =>
        c.es_emitido &&
        c.fecha_emision &&
        new Date(c.fecha_emision) >= inicioMes,
    )
    .reduce((acc, c) => acc + Number(c.total ?? 0), 0);

  const egresosMes = cfdisVisibles
    .filter(
      (c) =>
        !c.es_emitido &&
        c.fecha_emision &&
        new Date(c.fecha_emision) >= inicioMes,
    )
    .reduce((acc, c) => acc + Number(c.total ?? 0), 0);

  const margenMes = ingresosMes - egresosMes;
  const margenPct = ingresosMes > 0 ? (margenMes / ingresosMes) * 100 : 0;

  const cxc = cfdisVisibles
    .filter(
      (c) =>
        c.es_emitido &&
        c.estado === "timbrado" &&
        Number(c.saldo_pendiente ?? 0) > 0,
    )
    .reduce((acc, c) => acc + Number(c.saldo_pendiente ?? 0), 0);

  const totalBancos = (bancosSaldo ?? [])
    .filter((s) => s.empresa_id && empresasVisibles.includes(s.empresa_id))
    .reduce((acc, s) => acc + Number(s.saldo_total ?? 0), 0);

  const ocPendCount = (ocPendientes ?? []).length;
  const ocPendMonto = (ocPendientes ?? []).reduce(
    (acc, o) => acc + Number(o.total ?? 0),
    0,
  );

  // Proyectos con riesgo: orden por desviación (avance real - plan, ascendente — más negativos primero)
  const proyectosConRiesgo = [...proyectosVisibles]
    .map((p) => {
      const real = avanceFinanciero(p);
      const plan = avancePlan(p);
      return { ...p, _real: real, _plan: plan, _desv: real - plan };
    })
    .sort((a, b) => a._desv - b._desv)
    .slice(0, 8);

  const totalProyectos = proyectosVisibles.length;
  const proyectosVerdes = proyectosVisibles.filter(
    (p) => p.semaforo === "verde",
  ).length;
  const proyectosAmarillos = proyectosVisibles.filter(
    (p) => p.semaforo === "amarillo",
  ).length;
  const proyectosRojos = proyectosVisibles.filter(
    (p) => p.semaforo === "rojo",
  ).length;

  // Avance ponderado (por monto contratado)
  const totalContratado = proyectosVisibles.reduce(
    (acc, p) => acc + Number(p.monto_contratado ?? 0),
    0,
  );
  const avancePonderado =
    totalContratado > 0
      ? proyectosVisibles.reduce((acc, p) => {
          const peso = Number(p.monto_contratado ?? 0) / totalContratado;
          return acc + avanceFinanciero(p) * peso;
        }, 0)
      : 0;

  // Top 5 ingresos por empresa
  const ingresosPorEmpresa = (empresas ?? [])
    .filter((e) => empresasVisibles.includes(e.id))
    .map((e) => {
      const monto = cfdisVisibles
        .filter(
          (c) =>
            c.empresa_id === e.id &&
            c.es_emitido &&
            c.fecha_emision &&
            new Date(c.fecha_emision) >= inicioMes,
        )
        .reduce((acc, c) => acc + Number(c.total ?? 0), 0);
      return { ...e, monto };
    })
    .sort((a, b) => b.monto - a.monto);

  // Alertas dinámicas
  const alertas: Array<{
    sev: StatusLevel;
    title: string;
    meta: string;
  }> = [];
  if (proyectosRojos > 0) {
    alertas.push({
      sev: "danger",
      title: `${proyectosRojos} proyecto(s) con semáforo rojo`,
      meta: "Requieren atención inmediata",
    });
  }
  if (ocPendCount >= 5) {
    alertas.push({
      sev: "warning",
      title: `${ocPendCount} OC esperan VoBo`,
      meta: `${fmtMxn.format(ocPendMonto)} comprometidos`,
    });
  }
  if (cxc > totalBancos * 0.5) {
    alertas.push({
      sev: "warning",
      title: "CxC alta vs efectivo en bancos",
      meta: `${fmtMxn.format(cxc)} pendiente de cobro`,
    });
  }
  if (margenPct < 10 && ingresosMes > 0) {
    alertas.push({
      sev: "danger",
      title: "Margen del mes bajo el 10%",
      meta: `${margenPct.toFixed(1)}% · revisar costos`,
    });
  }
  if (alertas.length === 0) {
    alertas.push({
      sev: "ok",
      title: "Todo en orden",
      meta: "Sin alertas críticas",
    });
  }

  const fechaHoy = ahora.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      {/* Header */}
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">
            {verConsolidada
              ? "Vista consolidada · grupo GECIAE"
              : empresasVisibles.length === 1
                ? `Empresa: ${(empresas ?? []).find((e) => e.id === empresasVisibles[0])?.codigo ?? ""}`
                : `${empresasVisibles.length} empresa${empresasVisibles.length === 1 ? "" : "s"}`}
          </p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Dashboard ejecutivo
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Resumen al cierre de hoy · <span className="capitalize">{fechaHoy}</span>
            {empresaActivaId && empresaActivaId !== "consolidated" && (
              <span className="ml-2 text-ink-4">
                · cambia la vista en el switcher de la barra lateral
              </span>
            )}
          </p>
        </div>
        {verConsolidada && (
          <div>
            <Link
              href="/dashboard/pajaro"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium hover:bg-bg-2"
            >
              🦅 Vista pájaro · 4 empresas
            </Link>
          </div>
        )}
      </div>

      {/* Fila 1: KPIs principales (1 feature + 4 estándar) */}
      <div
        className="mb-5 grid gap-5"
        style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr" }}
      >
        <KpiFeature
          label={`Ingresos del mes${verConsolidada ? " · consolidado" : ""}`}
          value={fmtMxn.format(ingresosMes)}
          stats={[
            {
              label: "Margen",
              value: `${margenPct.toFixed(1)}%`,
            },
            {
              label: "Egresos",
              value: fmtMxn.format(egresosMes),
            },
            {
              label: "Margen $",
              value: fmtMxn.format(margenMes),
            },
          ]}
        />
        <KpiCard
          label="Cash en bancos"
          value={fmtMxn.format(totalBancos)}
          sub={
            cxc > 0 ? `+ ${fmtMxn.format(cxc)} por cobrar` : "—"
          }
          accent="ok"
        />
        <KpiCard
          label="Cuentas por cobrar"
          value={fmtMxn.format(cxc)}
          sub={`${cfdisVisibles.filter((c) => c.es_emitido && c.estado === "timbrado" && Number(c.saldo_pendiente ?? 0) > 0).length} facturas pendientes`}
          accent="warn"
        />
        <KpiCard
          label="OC pendientes VoBo"
          value={ocPendCount}
          sub={fmtMxn.format(ocPendMonto)}
          accent={ocPendCount > 5 ? "danger" : "brand"}
        />
      </div>

      {/* Fila 2: KPIs operativos · ARRASTRABLES + CLICKABLES */}
      <div className="mb-5">
        <DraggableKpiGrid
          storageKey="dashboard-kpis-operativos"
          columns={4}
          tiles={[
            {
              id: "proyectos-activos",
              label: "Proyectos activos",
              value: totalProyectos,
              sub: `${proyectosVerdes} ok · ${proyectosAmarillos} alerta · ${proyectosRojos} riesgo`,
              href: "/proyectos",
              accent: proyectosRojos > 0 ? "danger" : proyectosAmarillos > 0 ? "warn" : "brand",
            },
            {
              id: "avance-ponderado",
              label: "Avance ponderado",
              value: avancePonderado.toFixed(1),
              unit: "%",
              sub: "Por monto contratado",
              href: "/proyectos",
              accent: "brand",
            },
            {
              id: "ingresos-empresa-top",
              label: "Ingresos · empresa top",
              value: ingresosPorEmpresa[0]?.codigo ?? "—",
              sub: ingresosPorEmpresa[0]
                ? fmtMxn.format(ingresosPorEmpresa[0].monto)
                : "Sin datos del mes",
              href: "/finanzas/cfdi?direccion=emitidos",
              accent: "brand",
            },
            {
              id: "inventario-valor",
              label: "Inventario · valor",
              value: invValorMercado > 0 ? fmtMxn.format(invValorMercado) : "—",
              sub:
                invItemsAlerta > 0
                  ? `${invItemsAlerta} en alerta · ${invItemsTotal} items`
                  : `${invItemsTotal} items`,
              href: "/inventario",
              accent: invItemsAlerta > 0 ? "warn" : "brand",
            },
            {
              id: "calendario-eventos",
              label: "Calendario",
              value: "Ver",
              sub: "Tareas, SAT, comercial, vehículos",
              href: "/calendario",
              accent: "brand",
            },
            {
              id: "tickets-abiertos",
              label: "Soporte tickets",
              value: "Ver",
              sub: "Servicio post-venta · incidencias",
              href: "/soporte/tickets",
              accent: "brand",
            },
            {
              id: "vehiculos-flota",
              label: "Vehículos · flota",
              value: "Ver",
              sub: "Bitácora · documentos · seguros",
              href: "/activos/vehiculos",
              accent: "brand",
            },
            {
              id: "empresas-activas",
              label: "Empresas activas",
              value: empresasVisibles.length,
              sub: verConsolidada ? "Vista grupo" : "Solo tu acceso",
              href: verConsolidada ? "/dashboard/pajaro" : "/dashboard",
              accent: "brand",
            },
          ]}
        />
      </div>

      {/* Fila 3: cashflow + alertas */}
      <div
        className="mb-5 grid gap-5"
        style={{ gridTemplateColumns: "1.7fr 1fr" }}
      >
        <section className="rounded-md border border-border bg-card shadow-xs">
          <header className="flex items-center justify-between border-b border-divider px-5 py-3">
            <div>
              <h2 className="text-[13.5px] font-semibold">
                Flujo de efectivo · 6 meses
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-3">
                Ingresos vs egresos consolidados (CFDI emitidos vs recibidos)
              </p>
            </div>
            <Link
              href="/finanzas/cfdi"
              className="text-[12px] text-ink-3 hover:text-ink-1"
            >
              Ver CFDI →
            </Link>
          </header>
          <div className="px-5 py-4">
            <CashflowChart data={cashflowData} />
            <CashflowLegend margenMes={margenMes} />
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-divider pt-4">
              <Stat
                label="Ingresos mes"
                value={fmtMxn.format(ingresosMes)}
                color="var(--success-deep)"
              />
              <Stat label="Egresos mes" value={fmtMxn.format(egresosMes)} />
              <Stat
                label="Margen"
                value={`${margenPct.toFixed(1)}%`}
                sub={fmtMxn.format(margenMes)}
                color={margenMes >= 0 ? "var(--success-deep)" : "var(--danger-deep)"}
              />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card shadow-xs">
          <header className="flex items-center justify-between border-b border-divider px-5 py-3">
            <div>
              <h2 className="text-[13.5px] font-semibold">
                Alertas que requieren atención
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-3">
                {alertas.length}{" "}
                {alertas.length === 1 ? "alerta activa" : "alertas activas"}
              </p>
            </div>
            <AlertCircle className="h-4 w-4 text-ink-4" />
          </header>
          <ul className="divide-y divide-divider">
            {alertas.map((a, i) => (
              <li key={i}>
                <AlertItem
                  severity={a.sev}
                  title={a.title}
                  meta={a.meta}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Fila 4: Tabla de proyectos */}
      <section className="mb-5 rounded-md border border-border bg-card shadow-xs">
        <header className="flex items-center justify-between border-b border-divider px-5 py-3">
          <div>
            <h2 className="text-[13.5px] font-semibold">Proyectos activos</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">
              {totalProyectos} en curso · ordenados por desviación de avance
            </p>
          </div>
          <Link
            href="/proyectos"
            className="text-[12px] text-ink-3 hover:text-ink-1"
          >
            Ver todos →
          </Link>
        </header>
        {proyectosConRiesgo.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-ink-3">
            Sin proyectos activos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-bg-2 text-left">
                <tr>
                  <th className="border-b border-border-strong px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                    Proyecto
                  </th>
                  <th className="border-b border-border-strong px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                    Cliente
                  </th>
                  <th
                    className="border-b border-border-strong px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3"
                    style={{ width: 220 }}
                  >
                    Avance vs plan
                  </th>
                  <th className="border-b border-border-strong px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                    Contratado
                  </th>
                  <th className="border-b border-border-strong px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                    Facturado
                  </th>
                  <th className="border-b border-border-strong px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                    Empresa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {proyectosConRiesgo.map((p) => {
                  const cliente = p.clientes as { razon_social: string; nombre_comercial: string | null } | null;
                  const empresa = p.empresas as { codigo: string } | null;
                  const status = semaforoToStatus(p.semaforo);
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-bg-2"
                    >
                      <td className="px-5 py-3">
                        <Link href={`/proyectos/${p.id}`} className="block">
                          <div className="flex items-center gap-2.5">
                            <StatusDot status={status} />
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {p.nombre}
                              </div>
                              <div className="font-mono text-[11px] text-ink-3">
                                {p.codigo}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-ink-3">
                        {cliente?.nombre_comercial ?? cliente?.razon_social ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <DualBar
                            planned={p._plan}
                            actual={p._real}
                            max={100}
                            height={14}
                            className="flex-1"
                          />
                          <span
                            className={`min-w-[60px] font-mono tnum text-[11.5px] ${
                              p._real < p._plan
                                ? "text-danger-deep"
                                : "text-ink-2"
                            }`}
                          >
                            {p._real}/{p._plan}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tnum">
                        {fmtMxn.format(Number(p.monto_contratado ?? 0))}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tnum">
                        {fmtMxn.format(Number(p.monto_facturado ?? 0))}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[12px]">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              empresaCodigoColor[empresa?.codigo ?? ""] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          {empresa?.codigo ?? "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Fila 4.5: Posición consolidada · ARRASTRABLE + CLICKABLE */}
      <div className="mb-5">
        <DraggableKpiGrid
          storageKey="dashboard-posicion-consolidada"
          columns={6}
          tiles={[
            {
              id: "cash-bancos",
              label: "Cash bancos",
              value: fmtMxn.format(totalBancos),
              href: "/finanzas/tesoreria",
              accent: "ok",
            },
            {
              id: "inversiones",
              label: "Inversiones",
              value: fmtMxn.format(inversionTotal),
              sub: "Fondos / valores",
              href: "/finanzas/tesoreria",
              accent: inversionTotal > 0 ? "ok" : "brand",
            },
            {
              id: "credito-disp",
              label: "Crédito disponible",
              value: fmtMxn.format(creditoDisponible),
              sub: `Dispuesto ${fmtMxn.format(creditoDispuesto)}`,
              href: "/finanzas/tesoreria/creditos",
              accent: creditoDispuesto > 0 ? "warn" : "brand",
            },
            {
              id: "indirectos-mes",
              label: "Indirectos mes",
              value: fmtMxn.format(indirectosMensual),
              sub: `${gastosVisibles.length} gastos recurrentes`,
              href: "/finanzas/gastos-recurrentes",
              accent: "warn",
            },
            {
              id: "pipeline-cotiz",
              label: "Pipeline cotiz.",
              value: fmtMxn.format(cotizPipeline),
              sub: `${cotizsBorrador.length} borr · ${cotizsEnviadas.length} env · ${cotizsAceptadas.length} acep`,
              href: "/comercial/cotizaciones",
              accent: "brand",
            },
            {
              id: "utilidad-mes",
              label: `Utilidad ${etiquetaUltimoMes || "EFM"}`,
              value: fmtMxn.format(utilidadUltimoMes),
              sub:
                efmArr.length > 0
                  ? "Último cierre cargado"
                  : "Sin EFM cargado",
              href: "/finanzas/estados-financieros",
              accent:
                utilidadUltimoMes > 0
                  ? "ok"
                  : utilidadUltimoMes < 0
                    ? "danger"
                    : "brand",
            },
          ]}
        />
      </div>

      {/* Fila 4.6: Inventario consolidado */}
      {invItemsTotal > 0 && (
        <section className="mb-5 rounded-md border border-border bg-card shadow-xs">
          <header className="flex items-center justify-between border-b border-divider px-5 py-3">
            <div>
              <h2 className="text-[13.5px] font-semibold">
                Inventario · valor consolidado
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-3">
                {invItemsTotal} items activos
                {invItemsAlerta > 0 && (
                  <>
                    {" · "}
                    <span className="font-medium text-amber-700">
                      {invItemsAlerta} en alerta
                    </span>
                  </>
                )}
              </p>
            </div>
            <Link
              href="/inventario"
              className="text-[12px] text-brand hover:text-brand-deep"
            >
              Ver inventario completo →
            </Link>
          </header>

          <div className="grid grid-cols-2 gap-px border-b border-divider bg-divider lg:grid-cols-4">
            <div className="bg-card px-5 py-4">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                Valor a costo
              </p>
              <p className="mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.02em]">
                {fmtMxn.format(invValorCosto)}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-3">
                stock × costo promedio
              </p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                Valor a mercado
              </p>
              <p className="mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.02em]">
                {fmtMxn.format(invValorMercado)}
              </p>
              <p
                className={`mt-0.5 text-[11px] font-medium ${
                  invDeltaPct > 2
                    ? "text-emerald-700"
                    : invDeltaPct < -2
                      ? "text-red-700"
                      : "text-ink-3"
                }`}
              >
                {Math.abs(invDeltaPct) < 0.5
                  ? "≈ costo"
                  : `${invDeltaPct > 0 ? "▲ +" : "▼ "}${invDeltaPct.toFixed(1)}% vs costo`}
              </p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                Plusvalía / merma
              </p>
              <p
                className={`mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.02em] ${
                  invValorMercado - invValorCosto >= 0
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {invValorMercado - invValorCosto >= 0 ? "+" : ""}
                {fmtMxn.format(invValorMercado - invValorCosto)}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-3">
                potencial vs costo histórico
              </p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                Items en alerta
              </p>
              <p
                className={`mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.02em] ${
                  invItemsAlerta > 0 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {invItemsAlerta}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-3">
                {invItemsAlerta > 0
                  ? "agotados o stock bajo"
                  : "stock OK"}
              </p>
            </div>
          </div>

          {invTopItems.length > 0 && (
            <div className="px-5 py-3">
              <p className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                Top 5 por valor a mercado
              </p>
              <ul className="space-y-1">
                {invTopItems.map((it) => (
                  <li
                    key={it.producto_id}
                    className="flex items-center justify-between gap-3 text-[12.5px]"
                  >
                    <Link
                      href={`/inventario/${it.producto_id}`}
                      className="min-w-0 flex-1 truncate hover:text-brand"
                    >
                      <code className="font-mono text-[10.5px] text-ink-3">
                        {it.sku}
                      </code>{" "}
                      {it.nombre}
                    </Link>
                    <span className="text-[11px] text-ink-3 tabular-nums">
                      {Number(it.stock_actual).toLocaleString("es-MX", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      {it.unidad_medida}
                    </span>
                    <span className="font-mono text-[12.5px] font-medium tabular-nums">
                      {fmtMxn.format(Number(it.valor_mercado_total ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Fila 4.6: Obligaciones SAT próximas + conciliación */}
      <div
        className="mb-5 grid gap-5"
        style={{ gridTemplateColumns: "1.5fr 1fr" }}
      >
        <section className="rounded-md border border-border bg-card shadow-xs">
          <header className="flex items-center justify-between border-b border-divider px-5 py-3">
            <div>
              <h2 className="text-[13.5px] font-semibold">
                Obligaciones SAT próximas (30 días)
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-3">
                {obligaciones7d.length} vencen en ≤7 días ·{" "}
                {obligacionesFueraPlazo.length > 0 && (
                  <span className="text-destructive">
                    {obligacionesFueraPlazo.length} fuera de plazo
                  </span>
                )}
                {obligacionesFueraPlazo.length === 0 && "0 fuera de plazo"}
              </p>
            </div>
            <Link
              href="/finanzas/obligaciones"
              className="text-[12px] text-ink-3 hover:text-ink-1"
            >
              Ver calendario →
            </Link>
          </header>
          <ul className="divide-y divide-divider">
            {(obligaciones ?? [])
              .slice(0, 6)
              .map((o: Record<string, unknown>) => {
                const dias = Number(o.dias_al_vencer ?? 0);
                const fueraPlazo = o.estado_efectivo === "fuera_plazo";
                return (
                  <li
                    key={o.id as string}
                    className="flex items-center justify-between px-5 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          empresaCodigoColor[o.empresa_codigo as string] ??
                          "bg-muted-foreground"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] truncate">
                          {(o.empresa_codigo as string) ?? "—"} ·{" "}
                          {(o.tipo as string).replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] text-ink-3">
                          {(o.periodo_label as string) ?? ""} · vence{" "}
                          {new Date(
                            o.fecha_vencimiento as string,
                          ).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                        fueraPlazo
                          ? "bg-destructive/15 text-destructive"
                          : dias <= 7
                            ? "bg-amber-100 text-amber-700"
                            : "bg-bg-2 text-ink-3"
                      }`}
                    >
                      {fueraPlazo
                        ? `Hace ${Math.abs(dias)}d`
                        : dias === 0
                          ? "Hoy"
                          : `En ${dias}d`}
                    </span>
                  </li>
                );
              })}
            {(obligaciones?.length ?? 0) === 0 && (
              <li className="px-5 py-6 text-center text-[12px] text-ink-3">
                Sin obligaciones próximas a vencer.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-ok-deep" />
            <h3 className="text-[13.5px] font-semibold">Conciliación 30d</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[12px]">
                <span>Movs últimos 30 días</span>
                <span className="font-mono font-medium">{totalMovs30d}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-3">
                <div
                  className={`h-full ${
                    pctConciliacion30d >= 80
                      ? "bg-success"
                      : pctConciliacion30d >= 50
                        ? "bg-warning"
                        : "bg-destructive"
                  }`}
                  style={{ width: `${pctConciliacion30d}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-ink-3">
                {pctConciliacion30d.toFixed(0)}% conciliados (
                {movsConciliados30d}/{totalMovs30d})
              </p>
            </div>
          </div>
          <Link
            href="/finanzas/tesoreria/cuentas"
            className="mt-4 inline-block text-[12px] text-ink-3 hover:text-ink-1"
          >
            Ir a cuentas →
          </Link>
        </section>
      </div>

      {/* Fila 4.7: Arrendamientos vehículos + Top indirectos */}
      {gastosVisibles.length > 0 && (
        <div
          className="mb-5 grid gap-5"
          style={{ gridTemplateColumns: "1fr 1fr" }}
        >
          <section className="rounded-md border border-border bg-card shadow-xs">
            <header className="flex items-center justify-between border-b border-divider px-5 py-3">
              <div>
                <h2 className="text-[13.5px] font-semibold">
                  🚗 Arrendamientos de vehículos
                </h2>
                <p className="mt-0.5 text-[11.5px] text-ink-3">
                  {(() => {
                    const arr = gastosVisibles.filter(
                      (g) => g.categoria === "arrendamiento_vehiculo",
                    );
                    const total = arr.reduce(
                      (a, g) => a + Number(g.monto_mensualizado ?? 0),
                      0,
                    );
                    return arr.length > 0
                      ? `${arr.length} unidades · ${fmtMxn.format(total)} mensual`
                      : "Sin arrendamientos capturados";
                  })()}
                </p>
              </div>
              <Link
                href="/finanzas/gastos-recurrentes?categoria=arrendamiento_vehiculo"
                className="text-[12px] text-ink-3 hover:text-ink-1"
              >
                Ver lista →
              </Link>
            </header>
            <ul className="divide-y divide-divider">
              {gastosVisibles
                .filter((g) => g.categoria === "arrendamiento_vehiculo")
                .slice(0, 5)
                .map((g) => (
                  <li
                    key={g.id as string}
                    className="flex items-center justify-between px-5 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          empresaCodigoColor[g.empresa_codigo as string] ??
                          "bg-muted-foreground"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] truncate font-medium">
                          {g.descripcion as string}
                        </p>
                        {Boolean(g.identificador) && (
                          <p className="font-mono text-[10.5px] text-ink-3">
                            {g.identificador as string}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-mono tnum text-[12px] font-medium">
                      {fmtMxn.format(Number(g.monto_mensualizado ?? 0))}
                      <span className="ml-1 text-[10px] text-ink-3">/mes</span>
                    </span>
                  </li>
                ))}
              {gastosVisibles.filter(
                (g) => g.categoria === "arrendamiento_vehiculo",
              ).length === 0 && (
                <li className="px-5 py-6 text-center text-[12px] text-ink-3">
                  <Link
                    href="/finanzas/gastos-recurrentes/nuevo"
                    className="text-brand hover:underline"
                  >
                    Capturar primer arrendamiento →
                  </Link>
                </li>
              )}
            </ul>
          </section>

          <section className="rounded-md border border-border bg-card shadow-xs">
            <header className="flex items-center justify-between border-b border-divider px-5 py-3">
              <div>
                <h2 className="text-[13.5px] font-semibold">
                  Top 5 indirectos del mes
                </h2>
                <p className="mt-0.5 text-[11.5px] text-ink-3">
                  Total: {fmtMxn.format(indirectosMensual)}
                </p>
              </div>
              <Link
                href="/finanzas/gastos-recurrentes"
                className="text-[12px] text-ink-3 hover:text-ink-1"
              >
                Ver todos →
              </Link>
            </header>
            <ul className="divide-y divide-divider">
              {[...gastosVisibles]
                .sort(
                  (a, b) =>
                    Number(b.monto_mensualizado ?? 0) -
                    Number(a.monto_mensualizado ?? 0),
                )
                .slice(0, 5)
                .map((g) => {
                  const cat = (g.categoria as string).replace(/_/g, " ");
                  const pct =
                    indirectosMensual > 0
                      ? (Number(g.monto_mensualizado ?? 0) /
                          indirectosMensual) *
                        100
                      : 0;
                  return (
                    <li
                      key={g.id as string}
                      className="flex items-center justify-between px-5 py-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            empresaCodigoColor[g.empresa_codigo as string] ??
                            "bg-muted-foreground"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] truncate font-medium">
                            {g.descripcion as string}
                          </p>
                          <p className="text-[10.5px] text-ink-3 capitalize">
                            {cat}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono tnum text-[12px] font-medium">
                          {fmtMxn.format(
                            Number(g.monto_mensualizado ?? 0),
                          )}
                        </span>
                        <p className="text-[10px] text-ink-3">
                          {pct.toFixed(1)}%
                        </p>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        </div>
      )}

      {/* Fila 5: 4 mini paneles */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-ok-deep" />
            <h3 className="text-[13.5px] font-semibold">Salud de proyectos</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px]">
                <StatusDot status="ok" /> En tiempo
              </span>
              <span className="font-mono tnum font-medium">{proyectosVerdes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px]">
                <StatusDot status="warning" /> En alerta
              </span>
              <span className="font-mono tnum font-medium">{proyectosAmarillos}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px]">
                <StatusDot status="danger" /> En riesgo
              </span>
              <span className="font-mono tnum font-medium">{proyectosRojos}</span>
            </div>
          </div>
          <Link
            href="/proyectos"
            className="mt-4 inline-block text-[12px] text-ink-3 hover:text-ink-1"
          >
            Ver lista completa →
          </Link>
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-ok-deep" />
            <h3 className="text-[13.5px] font-semibold">Liquidez</h3>
          </div>
          <Stat
            label="En bancos"
            value={fmtMxn.format(totalBancos)}
            color="var(--success-deep)"
          />
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-divider pt-3">
            <Stat label="Por cobrar" value={fmtMxn.format(cxc)} />
            <Stat
              label="OC pendientes"
              value={fmtMxn.format(ocPendMonto)}
              sub={`${ocPendCount} OC`}
            />
          </div>
          <Link
            href="/finanzas/tesoreria"
            className="mt-4 inline-block text-[12px] text-ink-3 hover:text-ink-1"
          >
            Ir a tesorería →
          </Link>
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warn-deep" />
            <h3 className="text-[13.5px] font-semibold">Pendientes operativos</h3>
          </div>
          <div className="space-y-2.5 text-[13px]">
            {ocPendCount > 0 && (
              <Link
                href="/finanzas/oc?estado=pendiente_aprobacion"
                className="flex items-center justify-between rounded-md border border-border bg-bg-2 px-3 py-2 transition hover:border-brand"
              >
                <span>OC esperando VoBo</span>
                <span className="font-mono tnum font-semibold text-warn-deep">
                  {ocPendCount}
                </span>
              </Link>
            )}
            <Link
              href="/finanzas/cfdi?direccion=emitidos&estado=timbrado"
              className="flex items-center justify-between rounded-md border border-border bg-bg-2 px-3 py-2 transition hover:border-brand"
            >
              <span>CxC pendiente de cobro</span>
              <span className="font-mono tnum font-semibold">
                {
                  cfdisVisibles.filter(
                    (c) =>
                      c.es_emitido &&
                      c.estado === "timbrado" &&
                      Number(c.saldo_pendiente ?? 0) > 0,
                  ).length
                }
              </span>
            </Link>
            <Link
              href="/finanzas/tesoreria/prestamos?estado=solicitado"
              className="flex items-center justify-between rounded-md border border-border bg-bg-2 px-3 py-2 transition hover:border-brand"
            >
              <span>Préstamos por aprobar</span>
              <span className="font-mono tnum font-semibold">→</span>
            </Link>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-ink-3" />
            <h3 className="text-[13.5px] font-semibold">Ingresos · empresa</h3>
          </div>
          {ingresosPorEmpresa.every((e) => e.monto === 0) ? (
            <p className="text-[12px] text-ink-3">Sin datos del mes.</p>
          ) : (
            <ul className="space-y-2">
              {ingresosPorEmpresa.map((e) => {
                const max = ingresosPorEmpresa[0]?.monto || 1;
                const pct = (e.monto / max) * 100;
                return (
                  <li key={e.id}>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
                          }`}
                        />
                        <span className="font-medium">{e.codigo}</span>
                      </span>
                      <span className="font-mono tnum">
                        {fmtMxn.format(e.monto)}
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-bg-3">
                      <div
                        className={`h-full ${empresaCodigoColor[e.codigo] ?? "bg-brand"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/finanzas/cfdi?direccion=emitidos"
            className="mt-4 inline-block text-[12px] text-ink-3 hover:text-ink-1"
          >
            Ver detalle →
          </Link>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <Link href="/mi-dia">
          <Button variant="outline" size="sm">
            Ir a Mi día
          </Button>
        </Link>
      </div>
    </div>
  );
}
