import Link from "next/link";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  COLOR_SUBTIPO_CENTRO,
  COLOR_TIPO_CENTRO,
  ETIQUETA_SUBTIPO_CENTRO,
  ETIQUETA_TIPO_CENTRO,
  type SubtipoCentro,
  type TipoCentro,
} from "@/lib/centros/state";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const NOMBRES_MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

type PnLRow = {
  centro_id: string;
  empresa_id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  subtipo: string;
  anio: number;
  mes: number;
  costos_directos: number;
  costos_compartidos: number;
  ingresos: number;
  repartos_emitidos: number;
  resultado_neto: number;
};

export default async function CentrosPnlPage({
  searchParams,
}: {
  searchParams?: { empresa?: string; anio?: string; mes?: string };
}) {
  const vinculos = await obtenerVinculos();
  const puedeAcceder =
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "tesorero_corporativo") ||
    tieneAtributo(vinculos, "auditor_interno") ||
    vinculos.some((v) => v.rol === "director");
  if (!puedeAcceder) return null;

  const supabase = createClient();
  const today = new Date();
  const anio = Number(searchParams?.anio) || today.getFullYear();
  const mes = Number(searchParams?.mes) || today.getMonth() + 1;
  const empresaFiltro = searchParams?.empresa ?? "";

  const empresasIds = Array.from(new Set(vinculos.map((v) => v.empresa_id)));
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial")
    .in("id", empresasIds)
    .eq("activa", true)
    .order("codigo");

  // Vista v_centros_pnl
  const q = (
    supabase.from("v_centros_pnl" as never) as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: number | string,
        ) => {
          eq: (
            col: string,
            val: number | string,
          ) => {
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => Promise<{ data: PnLRow[] | null }>;
          };
        };
      };
    }
  )
    .select("*")
    .eq("anio", anio)
    .eq("mes", mes);

  const { data } = await q.order("resultado_neto", { ascending: false });

  let lista = data ?? [];
  if (empresaFiltro) {
    lista = lista.filter((r) => r.empresa_id === empresaFiltro);
  }

  // Sumas por tipo
  const cu = lista.filter((r) => r.tipo === "utilidad");
  const cc = lista.filter((r) => r.tipo === "costo");
  const totalIngresos = cu.reduce((a, r) => a + Number(r.ingresos), 0);
  const totalCostosDir = cu.reduce(
    (a, r) => a + Number(r.costos_directos),
    0,
  );
  const totalCostosComp = cu.reduce(
    (a, r) => a + Number(r.costos_compartidos),
    0,
  );
  const totalUtilidadCU = cu.reduce(
    (a, r) => a + Number(r.resultado_neto),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Reportes · Centros
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          P&amp;L por centro de utilidad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resultado neto = ingresos - costos directos - costos compartidos
          recibidos. Solo se incluyen los costos compartidos del mes ya
          cerrado.
        </p>
      </div>

      {/* Filtros */}
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
        <div className="space-y-1">
          <label htmlFor="mes" className="text-xs font-medium">
            Mes
          </label>
          <select
            id="mes"
            name="mes"
            defaultValue={mes}
            className="flex h-9 w-32 rounded-md border border-input bg-background px-2 text-sm"
          >
            {NOMBRES_MESES.map((nombre, i) => (
              <option key={i + 1} value={i + 1}>
                {nombre.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Aplicar
        </button>
      </form>

      {/* KPIs CU */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ingresos CU" value={fmt(totalIngresos)} tone="ok" />
        <Stat
          label="Costos directos"
          value={fmt(totalCostosDir)}
          tone="warn"
        />
        <Stat
          label="Costos compartidos"
          value={fmt(totalCostosComp)}
          tone="warn"
        />
        <Stat
          label="Utilidad CU"
          value={fmt(totalUtilidadCU)}
          tone={totalUtilidadCU >= 0 ? "ok" : "bad"}
        />
      </div>

      {/* CU table */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Centros de utilidad ({cu.length})
        </h2>
        <Tabla rows={cu} empresaPorId={mapEmpresas(empresas)} />
      </section>

      {/* CC table */}
      {cc.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold">
            Centros de costo ({cc.length})
          </h2>
          <Tabla rows={cc} empresaPorId={mapEmpresas(empresas)} />
        </section>
      )}
    </div>
  );
}

function mapEmpresas(empresas: Array<{ id: string; codigo: string }> | null) {
  return new Map((empresas ?? []).map((e) => [e.id, e.codigo as string]));
}

function Tabla({
  rows,
  empresaPorId,
}: {
  rows: PnLRow[];
  empresaPorId: Map<string, string>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-secondary/50">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Empresa</th>
            <th className="px-4 py-2 font-medium">Centro</th>
            <th className="px-4 py-2 font-medium">Tipo</th>
            <th className="px-4 py-2 font-medium">Subtipo</th>
            <th className="px-4 py-2 text-right font-medium">Ingresos</th>
            <th className="px-4 py-2 text-right font-medium">C. directos</th>
            <th className="px-4 py-2 text-right font-medium">C. comp.</th>
            <th className="px-4 py-2 text-right font-medium">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const codigoEmp = empresaPorId.get(r.empresa_id) ?? "?";
            const tipo = r.tipo as TipoCentro;
            const subtipo = r.subtipo as SubtipoCentro;
            const neto = Number(r.resultado_neto);
            return (
              <tr key={r.centro_id} className="hover:bg-secondary/30">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        codigoColor[codigoEmp] ?? "bg-muted-foreground"
                      }`}
                    />
                    <span className="font-medium">{codigoEmp}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/configuracion/centros/${r.centro_id}`}
                    className="hover:text-primary hover:underline"
                  >
                    <span className="font-mono text-xs">{r.codigo}</span>
                    <span className="ml-2">{r.nombre}</span>
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${COLOR_TIPO_CENTRO[tipo]}`}
                  >
                    {ETIQUETA_TIPO_CENTRO[tipo]}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs ${COLOR_SUBTIPO_CENTRO[subtipo]}`}
                  >
                    {ETIQUETA_SUBTIPO_CENTRO[subtipo]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                  {fmt(Number(r.ingresos))}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                  {fmt(Number(r.costos_directos))}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                  {fmt(Number(r.costos_compartidos))}
                </td>
                <td
                  className={`px-4 py-2 text-right font-mono text-xs tabular-nums ${
                    neto >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {fmt(neto)}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                Sin movimientos en el periodo seleccionado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
  tone?: "ok" | "warn" | "bad";
}) {
  const cl =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "bad"
          ? "text-rose-700"
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
