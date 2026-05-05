import { obtenerVinculos } from "@/lib/auth/permisos";
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

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

type Resumen = {
  vendedor_id: string;
  empresa_id: string;
  anio: number;
  mes: number;
  total_levantamientos: number;
  convertidos: number;
  no_convertidos: number;
  pendientes_definicion: number;
  tasa_conversion_pct: number | null;
  costo_total: number;
  costo_no_convertido: number;
  costo_convertido: number;
};

export default async function ReporteVendedoresPage({
  searchParams,
}: {
  searchParams?: { anio?: string; mes?: string };
}) {
  const vinculos = await obtenerVinculos();
  if (vinculos.length === 0) return null;

  const supabase = createClient();
  const today = new Date();
  const anio = Number(searchParams?.anio) || today.getFullYear();
  const mes = Number(searchParams?.mes) || today.getMonth() + 1;

  const { data: rows } = await (
    supabase.from("v_vendedores_conversion" as never) as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: number,
        ) => {
          eq: (
            col: string,
            val: number,
          ) => Promise<{ data: Resumen[] | null }>;
        };
      };
    }
  )
    .select("*")
    .eq("anio", anio)
    .eq("mes", mes);

  const lista = rows ?? [];

  // Empresas para etiqueta
  const empresasIds = Array.from(new Set(lista.map((r) => r.empresa_id)));
  const { data: empresas } = empresasIds.length
    ? await supabase
        .from("empresas")
        .select("id, codigo, nombre_comercial")
        .in("id", empresasIds)
    : { data: [] as Array<{ id: string; codigo: string; nombre_comercial: string | null }> };
  const empresaPorId = new Map(
    (empresas ?? []).map((e) => [e.id, e]),
  );

  const totalLev = lista.reduce((a, r) => a + r.total_levantamientos, 0);
  const totalConv = lista.reduce((a, r) => a + r.convertidos, 0);
  const totalNoConv = lista.reduce((a, r) => a + r.no_convertidos, 0);
  const totalCosto = lista.reduce((a, r) => a + Number(r.costo_total), 0);
  const tasaGlobal =
    totalConv + totalNoConv > 0
      ? (100 * totalConv) / (totalConv + totalNoConv)
      : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Reportes
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Conversión de vendedores
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tasa de conversión y costo acumulado por vendedor en el periodo
          seleccionado. La tasa se calcula sobre levantamientos ya cerrados
          (convertidos + no convertidos).
        </p>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
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

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Levantamientos" value={String(totalLev)} />
        <Stat label="Convertidos" value={String(totalConv)} tone="ok" />
        <Stat
          label="Tasa conversión"
          value={tasaGlobal != null ? `${tasaGlobal.toFixed(1)}%` : "—"}
        />
        <Stat label="Costo total" value={fmt(totalCosto)} tone="warn" />
      </div>

      {/* Tabla */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Vendedores ({lista.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Vendedor</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">
                  Convertidos
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  No convertidos
                </th>
                <th className="px-4 py-2 text-right font-medium">Pendientes</th>
                <th className="px-4 py-2 text-right font-medium">Tasa %</th>
                <th className="px-4 py-2 text-right font-medium">
                  Costo no convertido
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((r) => {
                const emp = empresaPorId.get(r.empresa_id);
                const tasa = r.tasa_conversion_pct;
                const tasaTone =
                  tasa == null
                    ? "text-muted-foreground"
                    : tasa >= 30
                      ? "text-emerald-700"
                      : tasa >= 15
                        ? "text-amber-700"
                        : "text-rose-700";
                return (
                  <tr
                    key={r.vendedor_id + r.empresa_id}
                    className="hover:bg-secondary/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            codigoColor[emp?.codigo ?? ""] ??
                            "bg-muted-foreground"
                          }`}
                        />
                        <span className="font-medium">
                          {emp?.codigo ?? "?"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.vendedor_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.total_levantamientos}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 tabular-nums">
                      {r.convertidos}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-700 tabular-nums">
                      {r.no_convertidos}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700 tabular-nums">
                      {r.pendientes_definicion}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular-nums ${tasaTone}`}
                    >
                      {tasa != null ? `${Number(tasa).toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                      {fmt(Number(r.costo_no_convertido))}
                    </td>
                  </tr>
                );
              })}
              {lista.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Sin levantamientos completados en este mes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Tip: tasa &gt;= 30% verde, 15-30% amarillo, &lt; 15% rojo. La tasa se
        calcula solo sobre cerrados; los pendientes no afectan el cálculo.
      </p>
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
  const toneClass =
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
      <p className={`mt-1 font-mono text-lg font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
