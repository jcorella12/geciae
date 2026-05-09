import { obtenerVinculos } from "@/lib/auth/permisos";
import {
  periodoMensual,
  periodoMesAnterior,
} from "@/lib/estados-gerenciales/state";
import { createClient } from "@/lib/supabase/server";

import {
  obtenerBalanceGeneral,
  obtenerComparativoResultados,
  obtenerFlujoEfectivo,
} from "./actions";
import { SelectorEmpresa } from "./selector-empresa";
import { SelectorPeriodoMensual } from "./selector-periodo";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export const dynamic = "force-dynamic";
export const metadata = { title: "Estados Gerenciales" };

type EmpresaOpt = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
};

export default async function ResumenEFPage({
  searchParams,
}: {
  searchParams: { empresa_id?: string; anio?: string; mes?: string };
}) {
  const ahora = new Date();
  const anio = Number(searchParams.anio ?? ahora.getFullYear());
  const mes = Number(searchParams.mes ?? ahora.getMonth() + 1);
  const empresaId = searchParams.empresa_id || null;

  const periodoActual = periodoMensual(anio, mes);
  const periodoAnterior = periodoMesAnterior(anio, mes);

  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasUsuario = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: empresas } = (await (supabase as any)
    .from("empresas")
    .select("id, codigo, nombre_comercial")
    .in("id", empresasUsuario)
    .order("codigo")) as unknown as { data: EmpresaOpt[] | null };

  const [balance, comparativo, flujo] = await Promise.all([
    obtenerBalanceGeneral(empresaId, periodoActual.fin),
    obtenerComparativoResultados(
      empresaId,
      periodoActual.inicio,
      periodoActual.fin,
      periodoAnterior.inicio,
      periodoAnterior.fin,
    ),
    obtenerFlujoEfectivo(empresaId, periodoActual.inicio, periodoActual.fin),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="lbl-mini">Finanzas · Estados Gerenciales</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight">
            Resumen
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Balance, Resultados y Flujo del periodo · Datos del ERP, no
            oficiales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectorPeriodoMensual anio={anio} mes={mes} />
          <SelectorEmpresa empresas={empresas ?? []} valor={empresaId ?? undefined} />
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Activos totales"
          valor={balance.activos.total}
          sub={`Bancos ${fmtMxn.format(balance.activos.circulantes.bancos)}`}
        />
        <Kpi
          label="Pasivos totales"
          valor={balance.pasivos.total}
          sub={`CxP ${fmtMxn.format(balance.pasivos.corto_plazo.cxp)}`}
        />
        <Kpi
          label="Capital calculado"
          valor={balance.capital.calculado}
          sub="Activos − Pasivos"
        />
        <Kpi
          label="Cash actual"
          valor={balance.activos.circulantes.bancos}
          sub={`CxC ${fmtMxn.format(balance.activos.circulantes.cxc_total)}`}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Ingresos del mes"
          valor={comparativo.actual.ingresos.subtotal}
          sub={`${comparativo.actual.ingresos.num_cfdis} CFDIs`}
          variacion={comparativo.variaciones.ingresos_pct}
        />
        <Kpi
          label="Costo de ventas"
          valor={comparativo.actual.costo_ventas.total}
          sub="materiales + inv + OT"
          variacion={comparativo.variaciones.costos_pct}
          variacionInversa
        />
        <Kpi
          label="Utilidad bruta"
          valor={comparativo.actual.utilidad_bruta.monto}
          sub={`${comparativo.actual.utilidad_bruta.pct.toFixed(1)}% margen`}
        />
        <Kpi
          label="Utilidad operativa"
          valor={comparativo.actual.utilidad_operativa.monto}
          sub={`${comparativo.actual.utilidad_operativa.pct.toFixed(1)}% margen`}
          variacion={comparativo.variaciones.utilidad_neta_pct}
        />
      </div>

      <section className="mt-6 rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 text-[15px] font-semibold">Flujo del mes</h2>
        <div className="grid grid-cols-3 gap-4 text-[12.5px]">
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-ink-3">
              Entradas
            </div>
            <div className="mt-1 font-mono text-[18px] font-semibold text-ok-deep tnum">
              {fmtMxn.format(flujo.entradas.total)}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-ink-3">
              Salidas
            </div>
            <div className="mt-1 font-mono text-[18px] font-semibold text-danger-deep tnum">
              {fmtMxn.format(flujo.salidas.total)}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-ink-3">
              Flujo neto
            </div>
            <div
              className={`mt-1 font-mono text-[18px] font-semibold tnum ${
                flujo.flujo_neto >= 0 ? "text-ok-deep" : "text-danger-deep"
              }`}
            >
              {fmtMxn.format(flujo.flujo_neto)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  function Kpi({
    label,
    valor,
    sub,
    variacion,
    variacionInversa,
  }: {
    label: string;
    valor: number;
    sub?: string;
    variacion?: number;
    variacionInversa?: boolean;
  }) {
    let tono = "";
    if (variacion !== undefined) {
      const positivo = variacionInversa ? variacion < 0 : variacion >= 0;
      tono = positivo ? "text-ok-deep" : "text-danger-deep";
    }
    return (
      <div className="rounded-md border border-border bg-card p-4">
        <div className="text-[10.5px] uppercase tracking-wide text-ink-3">
          {label}
        </div>
        <div className="mt-2 font-mono text-[20px] font-semibold tnum">
          {fmtMxn.format(valor)}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-3">
          {sub}
          {variacion !== undefined && (
            <span className={`font-mono font-medium tnum ${tono}`}>
              {fmtPct(variacion)}
            </span>
          )}
        </div>
      </div>
    );
  }
}
