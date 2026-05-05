import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
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

type RepartoRow = {
  empresa_destino_id: string;
  centro_origen_id: string;
  centro_origen_codigo: string;
  centro_origen_nombre: string;
  empresa_origen_id: string;
  anio: number;
  mes: number;
  monto_recibido: number;
  regla_reparto_id: string | null;
};

export default async function RepartoPage({
  searchParams,
}: {
  searchParams?: { anio?: string; mes?: string };
}) {
  const vinculos = await obtenerVinculos();
  const puede =
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "tesorero_corporativo") ||
    tieneAtributo(vinculos, "auditor_interno") ||
    vinculos.some((v) => v.rol === "director");
  if (!puede) return null;

  const supabase = createClient();
  const today = new Date();
  const anio = Number(searchParams?.anio) || today.getFullYear();
  const mes = Number(searchParams?.mes) || today.getMonth() + 1;

  const { data: rows } = await (
    supabase.from("v_centros_reparto_mensual" as never) as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: number,
        ) => {
          eq: (
            col: string,
            val: number,
          ) => {
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => Promise<{ data: RepartoRow[] | null }>;
          };
        };
      };
    }
  )
    .select("*")
    .eq("anio", anio)
    .eq("mes", mes)
    .order("monto_recibido", { ascending: false });

  const lista = rows ?? [];

  // Empresas para etiquetas
  const empresasIds = Array.from(
    new Set([
      ...lista.map((r) => r.empresa_destino_id),
      ...lista.map((r) => r.empresa_origen_id),
    ]),
  );
  const { data: empresas } = empresasIds.length
    ? await supabase
        .from("empresas")
        .select("id, codigo, nombre_comercial")
        .in("id", empresasIds)
    : {
        data: [] as Array<{
          id: string;
          codigo: string;
          nombre_comercial: string | null;
        }>,
      };
  const empresaPorId = new Map(
    (empresas ?? []).map((e) => [e.id, e]),
  );

  // Agregaciones
  const totalRepartido = lista.reduce(
    (a, r) => a + Number(r.monto_recibido),
    0,
  );

  // Pivot: empresa destino → suma de cada centro origen
  const pivot = new Map<string, Map<string, number>>(); // empresa → { centro_origen → monto }
  const centrosOrigen = new Set<string>();
  for (const r of lista) {
    centrosOrigen.add(r.centro_origen_codigo);
    const map = pivot.get(r.empresa_destino_id) ?? new Map();
    map.set(
      r.centro_origen_codigo,
      (map.get(r.centro_origen_codigo) ?? 0) + Number(r.monto_recibido),
    );
    pivot.set(r.empresa_destino_id, map);
  }

  const centrosOrigenArr = Array.from(centrosOrigen).sort();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Reportes · Centros
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Reparto inter-empresa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuánto se cargó cada centro de servicio compartido a cada empresa
          destino. Cuadrado = lo que efectivamente se generó como
          reparto_recibido en el cierre mensual.
        </p>
      </div>

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total repartido" value={fmt(totalRepartido)} />
        <Stat label="CC origen" value={String(centrosOrigenArr.length)} />
        <Stat label="Empresas destino" value={String(pivot.size)} />
      </div>

      {/* Pivot table */}
      {centrosOrigenArr.length > 0 && pivot.size > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">
            Distribución por destino
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Empresa destino</th>
                  {centrosOrigenArr.map((cod) => (
                    <th
                      key={cod}
                      className="px-4 py-2 text-right font-mono text-xs"
                    >
                      {cod}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from(pivot.entries()).map(([empId, centros]) => {
                  const emp = empresaPorId.get(empId);
                  let total = 0;
                  centros.forEach((v) => {
                    total += v;
                  });
                  return (
                    <tr key={empId} className="hover:bg-secondary/30">
                      <td className="px-4 py-2">
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
                          {emp?.nombre_comercial && (
                            <span className="text-muted-foreground">
                              · {emp.nombre_comercial}
                            </span>
                          )}
                        </div>
                      </td>
                      {centrosOrigenArr.map((cod) => {
                        const v = centros.get(cod) ?? 0;
                        return (
                          <td
                            key={cod}
                            className="px-4 py-2 text-right font-mono text-xs tabular-nums"
                          >
                            {v > 0 ? fmt(v) : "—"}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-mono text-xs font-semibold tabular-nums">
                        {fmt(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Sin repartos en el periodo. ¿Ya ejecutaste el cierre mensual en
          /finanzas/centros/cierre?
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}
