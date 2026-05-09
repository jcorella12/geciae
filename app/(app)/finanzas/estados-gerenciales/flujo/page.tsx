import { obtenerVinculos } from "@/lib/auth/permisos";
import { periodoMensual } from "@/lib/estados-gerenciales/state";
import { createClient } from "@/lib/supabase/server";

import { obtenerFlujoEfectivo, obtenerProyeccionFlujo } from "../actions";
import { SelectorEmpresa } from "../selector-empresa";
import { SelectorPeriodoMensual } from "../selector-periodo";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export const dynamic = "force-dynamic";
export const metadata = { title: "Flujo de Efectivo · Estados Gerenciales" };

type EmpresaOpt = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
};

export default async function FlujoPage({
  searchParams,
}: {
  searchParams: { empresa_id?: string; anio?: string; mes?: string };
}) {
  const ahora = new Date();
  const anio = Number(searchParams.anio ?? ahora.getFullYear());
  const mes = Number(searchParams.mes ?? ahora.getMonth() + 1);
  const empresaId = searchParams.empresa_id || null;
  const periodo = periodoMensual(anio, mes);

  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasUsuario = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: empresas } = (await (supabase as any)
    .from("empresas")
    .select("id, codigo, nombre_comercial")
    .in("id", empresasUsuario)
    .order("codigo")) as unknown as { data: EmpresaOpt[] | null };

  const [flujo, proyeccion] = await Promise.all([
    obtenerFlujoEfectivo(empresaId, periodo.inicio, periodo.fin),
    obtenerProyeccionFlujo(empresaId, 8),
  ]);

  const semanaRiesgo = proyeccion.proyeccion.find((p) => p.riesgo);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 py-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="lbl-mini">Estados Gerenciales</p>
          <h1 className="mt-1.5 text-[24px] font-semibold leading-tight">
            Flujo de Efectivo
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Movimientos bancarios clasificados del periodo · Proyección 8 semanas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectorPeriodoMensual anio={anio} mes={mes} />
          <SelectorEmpresa empresas={empresas ?? []} valor={empresaId ?? undefined} />
        </div>
      </div>

      {/* Flujo del periodo */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink-3">
            Saldo inicial
          </div>
          <div className="mt-2 font-mono text-[18px] font-semibold tnum">
            {fmtMxn.format(flujo.saldo_inicial)}
          </div>
        </div>
        <div className="rounded-md border-2 border-brand bg-brand/5 p-4">
          <div className="text-[11px] uppercase tracking-wide text-brand-deep">
            Flujo neto del mes
          </div>
          <div
            className={`mt-2 font-mono text-[20px] font-semibold tnum ${
              flujo.flujo_neto >= 0 ? "text-ok-deep" : "text-danger-deep"
            }`}
          >
            {fmtMxn.format(flujo.flujo_neto)}
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink-3">
            Saldo final
          </div>
          <div className="mt-2 font-mono text-[18px] font-semibold tnum">
            {fmtMxn.format(flujo.saldo_final)}
          </div>
        </div>
      </section>

      {/* Detalle entradas/salidas */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="mb-3 text-[14px] font-semibold text-ok-deep">
            Entradas · {fmtMxn.format(flujo.entradas.total)}
          </h2>
          <Linea label="Cobros de clientes" valor={flujo.entradas.cobros_clientes} />
          <Linea
            label="Transferencias recibidas"
            valor={flujo.entradas.transferencias}
          />
          <Linea label="Otras entradas" valor={flujo.entradas.otras} />
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="mb-3 text-[14px] font-semibold text-danger-deep">
            Salidas · {fmtMxn.format(flujo.salidas.total)}
          </h2>
          <Linea label="Pagos a proveedores" valor={flujo.salidas.pagos_proveedores} />
          <Linea label="Nómina" valor={flujo.salidas.nomina} />
          <Linea label="Impuestos" valor={flujo.salidas.impuestos} />
          <Linea label="Servicios" valor={flujo.salidas.servicios} />
          <Linea
            label="Transferencias enviadas"
            valor={flujo.salidas.transferencias}
          />
          <Linea
            label="Comisiones bancarias"
            valor={flujo.salidas.comisiones_banco}
          />
          <Linea label="Otras salidas" valor={flujo.salidas.otras} />
        </div>
      </section>

      {/* Proyección */}
      <section className="mt-6 rounded-md border border-border bg-card p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            Proyección {proyeccion.horizonte_semanas} semanas
          </h2>
          <span className="text-[11px] text-ink-3">
            Basada en CxC + CxP existentes distribuidas en el horizonte
          </span>
        </header>

        {semanaRiesgo && (
          <div className="mb-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-[12px] text-danger-deep">
            ⚠ Saldo proyectado negativo en la semana {semanaRiesgo.semana_n} (
            {fmtMxn.format(semanaRiesgo.saldo_proyectado)}). Considera adelantar
            cobros o aplazar pagos.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-bg-2 text-[10.5px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Semana</th>
                <th className="px-2 py-2 text-left font-medium">Periodo</th>
                <th className="px-2 py-2 text-right font-medium">
                  Cobros esperados
                </th>
                <th className="px-2 py-2 text-right font-medium">Pagos planeados</th>
                <th className="px-2 py-2 text-right font-medium">Flujo neto</th>
                <th className="px-2 py-2 text-right font-medium">Saldo proyectado</th>
              </tr>
            </thead>
            <tbody>
              {proyeccion.proyeccion.map((p) => (
                <tr
                  key={p.semana_n}
                  className={`border-t border-border ${
                    p.riesgo ? "bg-danger/5" : ""
                  }`}
                >
                  <td className="px-2 py-2">{p.semana_n}</td>
                  <td className="px-2 py-2 font-mono text-[10.5px]">
                    {p.inicio} → {p.fin}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-ok-deep tnum">
                    {fmtMxn.format(p.cobros_esperados)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-danger-deep tnum">
                    {fmtMxn.format(p.pagos_planeados)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-mono tnum ${
                      p.flujo_neto >= 0 ? "" : "text-danger-deep"
                    }`}
                  >
                    {fmtMxn.format(p.flujo_neto)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-mono font-semibold tnum ${
                      p.saldo_proyectado >= 0
                        ? "text-ok-deep"
                        : "text-danger-deep"
                    }`}
                  >
                    {fmtMxn.format(p.saldo_proyectado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  function Linea({ label, valor }: { label: string; valor: number }) {
    return (
      <div className="flex items-baseline justify-between border-b border-border/60 py-1.5 text-[12.5px]">
        <span>{label}</span>
        <span className="font-mono tnum">{fmtMxn.format(valor)}</span>
      </div>
    );
  }
}
