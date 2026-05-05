import Link from "next/link";
import { redirect } from "next/navigation";

import {
  esCEO,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

type CompRow = {
  empleado_id: string;
  empresa_id: string;
  anio: number;
  total_percepciones_timbradas: number;
  total_deducciones: number;
  total_neto_recibido: number;
  total_otros_pagos: number;
  total_bonos_no_timbrados: number;
  total_capacitacion_recibida: number;
  total_combustible_vehiculo: number;
};

export default async function CompensacionEquipoPage({
  searchParams,
}: {
  searchParams?: { anio?: string; empresa?: string };
}) {
  const v = await obtenerVinculos();
  const empresasDirector = v
    .filter((vi) => vi.rol === "director")
    .map((vi) => vi.empresa_id);
  const puede = esCEO(v) || empresasDirector.length > 0;
  if (!puede) redirect("/portal-empleado");

  const supabase = createClient();
  const today = new Date();
  const anio = Number(searchParams?.anio) || today.getFullYear();
  const empresaFiltro = searchParams?.empresa ?? "";

  // Empresas accesibles
  const empresasIds = esCEO(v)
    ? Array.from(new Set(v.map((vi) => vi.empresa_id)))
    : empresasDirector;

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial")
    .in("id", empresasIds.length > 0 ? empresasIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("activa", true)
    .order("codigo");

  // Compensación de todos los empleados del año
  const { data: comps } = await (
    supabase.from("v_empleado_compensacion_anual" as never) as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: number,
        ) => Promise<{ data: CompRow[] | null }>;
      };
    }
  )
    .select("*")
    .eq("anio", anio);

  const compsLista = (comps ?? []).filter((c) =>
    empresasIds.includes(c.empresa_id),
  );

  // Empleados para etiquetas
  const empleadosIds = compsLista.map((c) => c.empleado_id);
  const { data: empleados } = empleadosIds.length
    ? await supabase
        .from("empleados")
        .select("id, nombre_completo, puesto, area, empresa_id")
        .in("id", empleadosIds)
    : {
        data: [] as Array<{
          id: string;
          nombre_completo: string;
          puesto: string;
          area: string | null;
          empresa_id: string;
        }>,
      };

  const empleadoPorId = new Map((empleados ?? []).map((e) => [e.id, e]));
  const empresaPorId = new Map(
    (empresas ?? []).map((e) => [e.id, e.codigo as string]),
  );

  // Filtro empresa
  let listaFiltrada = compsLista;
  if (empresaFiltro) {
    listaFiltrada = compsLista.filter((c) => c.empresa_id === empresaFiltro);
  }

  // Calcular costo total empresa por empleado
  const filas = listaFiltrada
    .map((c) => {
      const emp = empleadoPorId.get(c.empleado_id);
      if (!emp) return null;
      const costoEmpresa =
        Number(c.total_neto_recibido) +
        Number(c.total_deducciones) +
        Number(c.total_bonos_no_timbrados) +
        Number(c.total_capacitacion_recibida) +
        Number(c.total_combustible_vehiculo);
      return {
        empleado_id: c.empleado_id,
        nombre: emp.nombre_completo,
        puesto: emp.puesto,
        area: emp.area,
        empresa_codigo: empresaPorId.get(c.empresa_id) ?? "?",
        bruto: Number(c.total_percepciones_timbradas),
        deducciones: Number(c.total_deducciones),
        neto: Number(c.total_neto_recibido),
        bonos: Number(c.total_bonos_no_timbrados),
        capacitacion: Number(c.total_capacitacion_recibida),
        combustible: Number(c.total_combustible_vehiculo),
        costo_empresa: costoEmpresa,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.costo_empresa - a.costo_empresa);

  const totalEmpresa = filas.reduce((a, r) => a + r.costo_empresa, 0);
  const totalNeto = filas.reduce((a, r) => a + r.neto, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <Link
          href="/personas"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Personas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Compensación del equipo {anio}
        </h1>
        <p className="text-sm text-muted-foreground">
          Vista consolidada del costo total empresa por empleado: neto +
          deducciones + bonos + capacitación + gasolina vehículo.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="empresa" className="text-xs font-medium">
            Empresa
          </label>
          <select
            id="empresa"
            name="empresa"
            defaultValue={empresaFiltro}
            className="flex h-9 w-48 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todas</option>
            {(empresas ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} — {e.nombre_comercial}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="anio" className="text-xs font-medium">
            Año
          </label>
          <input
            id="anio"
            name="anio"
            type="number"
            min={2020}
            max={2099}
            defaultValue={anio}
            className="flex h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Aplicar
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Empleados" value={String(filas.length)} />
        <Stat label="Total neto pagado" value={fmt(totalNeto)} tone="ok" />
        <Stat label="Costo total empresa" value={fmt(totalEmpresa)} tone="warn" />
      </div>

      <section>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Empleado</th>
                <th className="px-4 py-2 font-medium">Puesto</th>
                <th className="px-4 py-2 text-right font-medium">Bruto</th>
                <th className="px-4 py-2 text-right font-medium">Deducc.</th>
                <th className="px-4 py-2 text-right font-medium">Neto</th>
                <th className="px-4 py-2 text-right font-medium">Bonos</th>
                <th className="px-4 py-2 text-right font-medium">Capac.</th>
                <th className="px-4 py-2 text-right font-medium">Combust.</th>
                <th className="px-4 py-2 text-right font-medium">Costo empresa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((r) => (
                <tr key={r.empleado_id} className="hover:bg-secondary/30">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          codigoColor[r.empresa_codigo] ?? "bg-muted-foreground"
                        }`}
                      />
                      <span className="font-medium">{r.empresa_codigo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/portal-empleado?empleado=${r.empleado_id}&anio=${anio}`}
                      className="hover:text-primary hover:underline"
                    >
                      {r.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {r.puesto}
                    {r.area && ` · ${r.area}`}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                    {fmt(r.bruto)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-rose-700">
                    {fmt(r.deducciones)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-emerald-700 font-semibold">
                    {fmt(r.neto)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-amber-700">
                    {r.bonos > 0 ? fmt(r.bonos) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                    {r.capacitacion > 0 ? fmt(r.capacitacion) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                    {r.combustible > 0 ? fmt(r.combustible) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-blue-700 font-semibold">
                    {fmt(r.costo_empresa)}
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Sin datos para este año. Asegúrate de haber subido los
                    XMLs de nómina.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const cl =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : "";
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-mono text-lg font-semibold tabular-nums ${cl}`}>
        {value}
      </p>
    </div>
  );
}
