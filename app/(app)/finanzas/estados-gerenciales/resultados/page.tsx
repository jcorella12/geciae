import { obtenerVinculos } from "@/lib/auth/permisos";
import {
  periodoMensual,
  periodoMesAnterior,
} from "@/lib/estados-gerenciales/state";
import { createClient } from "@/lib/supabase/server";

import { obtenerComparativoResultados } from "../actions";
import { SelectorEmpresa } from "../selector-empresa";
import { SelectorPeriodoMensual } from "../selector-periodo";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export const dynamic = "force-dynamic";
export const metadata = { title: "Estado de Resultados · Estados Gerenciales" };

type EmpresaOpt = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
};

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: { empresa_id?: string; anio?: string; mes?: string };
}) {
  const ahora = new Date();
  const anio = Number(searchParams.anio ?? ahora.getFullYear());
  const mes = Number(searchParams.mes ?? ahora.getMonth() + 1);
  const empresaId = searchParams.empresa_id || null;

  const periodoActual = periodoMensual(anio, mes);
  const periodoAnt = periodoMesAnterior(anio, mes);

  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasUsuario = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: empresas } = (await (supabase as any)
    .from("empresas")
    .select("id, codigo, nombre_comercial")
    .in("id", empresasUsuario)
    .order("codigo")) as unknown as { data: EmpresaOpt[] | null };

  const comp = await obtenerComparativoResultados(
    empresaId,
    periodoActual.inicio,
    periodoActual.fin,
    periodoAnt.inicio,
    periodoAnt.fin,
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-8 py-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="lbl-mini">Estados Gerenciales</p>
          <h1 className="mt-1.5 text-[24px] font-semibold leading-tight">
            Estado de Resultados
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {periodoActual.inicio} → {periodoActual.fin} · vs período anterior
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectorPeriodoMensual anio={anio} mes={mes} />
          <SelectorEmpresa empresas={empresas ?? []} valor={empresaId ?? undefined} />
        </div>
      </div>

      <section className="rounded-md border border-border bg-card p-5">
        <table className="w-full text-[12.5px]">
          <thead className="text-[10.5px] uppercase tracking-wide text-ink-3">
            <tr className="border-b border-border">
              <th className="pb-2 text-left font-medium">Concepto</th>
              <th className="pb-2 text-right font-medium">Periodo actual</th>
              <th className="pb-2 text-right font-medium">Periodo anterior</th>
              <th className="pb-2 text-right font-medium">Variación</th>
            </tr>
          </thead>
          <tbody className="text-[12.5px]">
            <Fila
              etiqueta="Ingresos"
              actual={comp.actual.ingresos.subtotal}
              anterior={comp.anterior.ingresos.subtotal}
              variacion={comp.variaciones.ingresos_pct}
              destacar
            />
            <FilaSub
              etiqueta="Materiales (OCs proyecto)"
              actual={comp.actual.costo_ventas.materiales}
              anterior={comp.anterior.costo_ventas.materiales}
            />
            <FilaSub
              etiqueta="Inventario consumido"
              actual={comp.actual.costo_ventas.inventario_consumido}
              anterior={comp.anterior.costo_ventas.inventario_consumido}
            />
            <FilaSub
              etiqueta="Subcontratos (OT inter-co)"
              actual={comp.actual.costo_ventas.subcontratos}
              anterior={comp.anterior.costo_ventas.subcontratos}
            />
            <Fila
              etiqueta="Total costo de ventas"
              actual={comp.actual.costo_ventas.total}
              anterior={comp.anterior.costo_ventas.total}
              variacion={comp.variaciones.costos_pct}
              variacionInversa
              destacar
            />
            <FilaResultado
              etiqueta="Utilidad bruta"
              actual={comp.actual.utilidad_bruta.monto}
              anterior={comp.anterior.utilidad_bruta.monto}
              actualPct={comp.actual.utilidad_bruta.pct}
            />

            <FilaSub
              etiqueta="Gastos administrativos (OCs sin proyecto)"
              actual={comp.actual.gastos_operativos.admin}
              anterior={comp.anterior.gastos_operativos.admin}
            />
            <FilaSub
              etiqueta="Gastos recurrentes"
              actual={comp.actual.gastos_operativos.recurrentes}
              anterior={comp.anterior.gastos_operativos.recurrentes}
            />
            <FilaSub
              etiqueta="Reparto de indirectos"
              actual={comp.actual.gastos_operativos.indirectos}
              anterior={comp.anterior.gastos_operativos.indirectos}
            />
            <Fila
              etiqueta="Total gastos operativos"
              actual={comp.actual.gastos_operativos.total}
              anterior={comp.anterior.gastos_operativos.total}
              destacar
            />

            <FilaResultado
              etiqueta="Utilidad operativa"
              actual={comp.actual.utilidad_operativa.monto}
              anterior={comp.anterior.utilidad_operativa.monto}
              actualPct={comp.actual.utilidad_operativa.pct}
              variacion={comp.variaciones.utilidad_neta_pct}
            />
          </tbody>
        </table>
      </section>

      <p className="mt-3 text-[11px] text-ink-3">
        ⚠ Aproximación. NO incluye depreciación de activos fijos, ISR ni
        ajustes contables del cierre.
      </p>
    </div>
  );

  function Fila({
    etiqueta,
    actual,
    anterior,
    variacion,
    variacionInversa,
    destacar,
  }: {
    etiqueta: string;
    actual: number;
    anterior: number;
    variacion?: number;
    variacionInversa?: boolean;
    destacar?: boolean;
  }) {
    let tono = "";
    if (variacion !== undefined) {
      const positivo = variacionInversa ? variacion < 0 : variacion >= 0;
      tono = positivo ? "text-ok-deep" : "text-danger-deep";
    }
    return (
      <tr
        className={`border-b border-border/60 ${
          destacar ? "font-semibold" : ""
        }`}
      >
        <td className="py-2">{etiqueta}</td>
        <td className="py-2 text-right font-mono tnum">{fmtMxn.format(actual)}</td>
        <td className="py-2 text-right font-mono tnum text-ink-3">
          {fmtMxn.format(anterior)}
        </td>
        <td className={`py-2 text-right font-mono text-[11.5px] tnum ${tono}`}>
          {variacion !== undefined ? fmtPct(variacion) : "—"}
        </td>
      </tr>
    );
  }

  function FilaSub({
    etiqueta,
    actual,
    anterior,
  }: {
    etiqueta: string;
    actual: number;
    anterior: number;
  }) {
    return (
      <tr className="border-b border-border/40 text-ink-3">
        <td className="py-1.5 pl-4 text-[11.5px]">{etiqueta}</td>
        <td className="py-1.5 text-right font-mono text-[11.5px] tnum">
          {fmtMxn.format(actual)}
        </td>
        <td className="py-1.5 text-right font-mono text-[11.5px] tnum">
          {fmtMxn.format(anterior)}
        </td>
        <td className="py-1.5"></td>
      </tr>
    );
  }

  function FilaResultado({
    etiqueta,
    actual,
    anterior,
    actualPct,
    variacion,
  }: {
    etiqueta: string;
    actual: number;
    anterior: number;
    actualPct: number;
    variacion?: number;
  }) {
    const tono =
      actual >= 0 ? "text-ok-deep bg-ok/5" : "text-danger-deep bg-danger/5";
    let tonoVar = "";
    if (variacion !== undefined) {
      tonoVar = variacion >= 0 ? "text-ok-deep" : "text-danger-deep";
    }
    return (
      <tr className={`border-y-2 border-border ${tono}`}>
        <td className="py-2.5 font-semibold">{etiqueta}</td>
        <td className="py-2.5 text-right">
          <div className="font-mono font-semibold tnum">
            {fmtMxn.format(actual)}
          </div>
          <div className="text-[10.5px] opacity-80">
            {actualPct.toFixed(1)}% margen
          </div>
        </td>
        <td className="py-2.5 text-right font-mono tnum text-ink-3">
          {fmtMxn.format(anterior)}
        </td>
        <td
          className={`py-2.5 text-right font-mono text-[11.5px] font-medium tnum ${tonoVar}`}
        >
          {variacion !== undefined ? fmtPct(variacion) : "—"}
        </td>
      </tr>
    );
  }
}
