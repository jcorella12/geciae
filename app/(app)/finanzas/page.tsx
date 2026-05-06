import {
  ArrowRight,
  Banknote,
  CalendarDays,
  ClipboardList,
  CreditCard,
  EyeOff,
  FileBarChart,
  FileText,
  Receipt,
  RefreshCw,
  Shield,
  ShoppingCart,
  TrendingUp,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { KpiCard } from "@/components/ui/kpi-card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Finanzas" };

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const modulos = [
  {
    href: "/finanzas/oc",
    label: "Compras (OC)",
    desc: "Órdenes de compra con aprobación por umbrales y vinculación a CFDI recibido.",
    icon: ShoppingCart,
  },
  {
    href: "/finanzas/cfdi",
    label: "CFDI",
    desc: "Registro de facturas timbradas (emitidas y recibidas), pagos y cancelaciones.",
    icon: Receipt,
  },
  {
    href: "/finanzas/ot",
    label: "OT inter-compañías",
    desc: "Órdenes de trabajo entre empresas con margen automático y doble confirmación.",
    icon: ClipboardList,
  },
  {
    href: "/finanzas/tesoreria",
    label: "Tesorería",
    desc: "Posición consolidada, líneas de crédito, préstamos, matriz inter-co e intereses TIIE.",
    icon: Banknote,
  },
  {
    href: "/finanzas/proveedores",
    label: "Proveedores",
    desc: "Catálogo con semáforo de cumplimiento (verde/amarillo/rojo/negro).",
    icon: Truck,
  },
  {
    href: "/finanzas/servicios",
    label: "Catálogo de servicios",
    desc: "Servicios inter-co con costo base y margen automático.",
    icon: FileText,
  },
  {
    href: "/finanzas/estados-financieros",
    label: "Estados financieros mensuales",
    desc: "Paquetes contables del despacho — balance, ER, balanza, flujo, IVA, pólizas por mes.",
    icon: FileBarChart,
  },
  {
    href: "/finanzas/obligaciones",
    label: "Obligaciones SAT",
    desc: "Calendario fiscal — IVA, ISR, DIOT, REPSE, anuales con vencimientos y semáforo.",
    icon: CalendarDays,
  },
  {
    href: "/finanzas/gastos-recurrentes",
    label: "Gastos recurrentes",
    desc: "Arrendamientos, rentas, software, seguros — indirectos mensualizados del grupo.",
    icon: RefreshCw,
  },
] as const;

const modulosRestringidos = [
  {
    href: "/finanzas/ajustes-gerenciales",
    label: "Ajustes gerenciales",
    desc: "Activos ocultos, pasivos no registrados y aportaciones no formalizadas. Capa interna paralela a la contabilidad fiscal.",
    icon: Shield,
  },
  {
    href: "/finanzas/vista-real",
    label: "Vista real del grupo",
    desc: "Patrimonio incluyendo ajustes gerenciales. Combina contabilidad fiscal con realidad económica.",
    icon: EyeOff,
  },
] as const;

export default async function FinanzasIndexPage() {
  const supabase = createClient();

  const inicioMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();

  const [
    { data: bancosSaldo },
    { data: cfdisMes },
    { data: ocPendientes },
    { data: prestamosVivos },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { data: puedeVerAjustes },
  ] = await Promise.all([
    supabase.from("v_saldo_bancos_por_empresa").select("saldo_total"),
    supabase
      .from("cfdi")
      .select("total, monto_pagado, saldo_pendiente, es_emitido, estado")
      .neq("estado", "cancelado")
      .gte("fecha_emision", inicioMes),
    supabase
      .from("ordenes_compra")
      .select("total")
      .eq("estado", "pendiente_aprobacion"),
    supabase
      .from("prestamos_inter_co")
      .select("saldo_pendiente")
      .in("estado", ["ejecutado", "confirmado", "pagado_parcial"]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc("usuario_puede_ver_ajustes_gerenciales"),
  ]);

  const totalBancos = (bancosSaldo ?? []).reduce(
    (a, b) => a + Number(b.saldo_total ?? 0),
    0,
  );
  const ingresosMes = (cfdisMes ?? [])
    .filter((c) => c.es_emitido)
    .reduce((a, c) => a + Number(c.total ?? 0), 0);
  const egresosMes = (cfdisMes ?? [])
    .filter((c) => !c.es_emitido)
    .reduce((a, c) => a + Number(c.total ?? 0), 0);
  const cxc = (cfdisMes ?? [])
    .filter((c) => c.es_emitido && c.estado === "timbrado")
    .reduce((a, c) => a + Number(c.saldo_pendiente ?? 0), 0);
  const ocPendMonto = (ocPendientes ?? []).reduce(
    (a, o) => a + Number(o.total ?? 0),
    0,
  );
  const prestamosOuts = (prestamosVivos ?? []).reduce(
    (a, p) => a + Number(p.saldo_pendiente ?? 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-7">
        <p className="lbl-mini">Administración y Finanzas</p>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Finanzas
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Acceso rápido a los módulos financieros del grupo.
        </p>
      </div>

      {/* KPIs rápidos */}
      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Cash en bancos"
          value={fmtMxn.format(totalBancos)}
          accent="ok"
        />
        <KpiCard
          label="Ingresos del mes"
          value={fmtMxn.format(ingresosMes)}
          sub={`Egresos ${fmtMxn.format(egresosMes)}`}
        />
        <KpiCard
          label="Por cobrar"
          value={fmtMxn.format(cxc)}
          accent="warn"
        />
        <KpiCard
          label="Préstamos vivos"
          value={fmtMxn.format(prestamosOuts)}
        />
      </div>

      {ocPendMonto > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-warn/40 bg-warn-soft/50 px-5 py-3">
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-warn-deep" />
            <p className="text-[13px]">
              <strong>{(ocPendientes ?? []).length} OC</strong> esperando
              aprobación · {fmtMxn.format(ocPendMonto)} comprometidos
            </p>
          </div>
          <Link
            href="/finanzas/oc?estado=pendiente_aprobacion"
            className="text-[12px] font-medium text-brand hover:underline"
          >
            Revisar →
          </Link>
        </div>
      )}

      {/* Módulos */}
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {modulos.map((m) => {
          const Icon = m.icon;
          return (
            <li key={m.href}>
              <Link
                href={m.href}
                className="group flex h-full items-start gap-3 rounded-md border border-border bg-card p-5 shadow-xs transition hover:border-brand"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-ink-2 group-hover:bg-brand-soft group-hover:text-brand-deep">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">{m.label}</p>
                  <p className="mt-1 text-[12px] text-ink-3">{m.desc}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-4 transition group-hover:text-brand" />
              </Link>
            </li>
          );
        })}
      </ul>

      {puedeVerAjustes && (
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-amber-700" />
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-amber-900">
              Información gerencial · acceso restringido
            </h2>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {modulosRestringidos.map((m) => {
              const Icon = m.icon;
              return (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    className="group flex h-full items-start gap-3 rounded-md border border-amber-300 bg-amber-50/50 p-5 shadow-xs transition hover:border-amber-500 hover:bg-amber-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold">{m.label}</p>
                      <p className="mt-1 text-[12px] text-ink-3">{m.desc}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-amber-700 transition group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-brand"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Ver dashboard ejecutivo del grupo →
        </Link>
      </div>
    </div>
  );
}
