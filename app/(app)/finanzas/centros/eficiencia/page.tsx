import { redirect } from "next/navigation";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NOMBRES_MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function EficienciaPage({
  searchParams,
}: {
  searchParams?: { centro?: string; anio?: string };
}) {
  const vinculos = await obtenerVinculos();
  const puede =
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "tesorero_corporativo") ||
    tieneAtributo(vinculos, "auditor_interno") ||
    vinculos.some((v) => v.rol === "director");
  if (!puede) redirect("/mi-dia");

  const supabase = createClient();
  const today = new Date();
  const anio = Number(searchParams?.anio) || today.getFullYear();

  // Lista de centros operativos de Ingeniería para el selector
  const empresasIds = Array.from(new Set(vinculos.map((v) => v.empresa_id)));
  const { data: centros } = await supabase
    .from("centros")
    .select("id, codigo, nombre, empresa_id, empresas!centros_empresa_id_fkey(codigo)")
    .in("empresa_id", empresasIds)
    .eq("activo", true)
    .eq("subtipo", "operativo")
    .order("codigo");

  const centroId =
    searchParams?.centro ||
    (centros ?? []).find((c) =>
      c.codigo.toUpperCase().includes("INGENIERIA"),
    )?.id ||
    centros?.[0]?.id;

  if (!centroId || !centros || centros.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold">Eficiencia $/Wp</h1>
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          No hay centros operativos disponibles. Crea al menos un CC operativo
          (idealmente Ingeniería PSE) en /configuracion/centros para usar este
          reporte.
        </p>
      </div>
    );
  }

  // Costos del centro por mes en el año
  type Mov = { fecha: string; tipo: string; monto: number };
  const inicio = `${anio}-01-01`;
  const fin = `${anio + 1}-01-01`;
  const { data: movs } = await supabase
    .from("centros_movimientos")
    .select("fecha, tipo, monto")
    .eq("centro_id", centroId)
    .gte("fecha", inicio)
    .lt("fecha", fin);

  const costosPorMes = new Array(12).fill(0);
  for (const m of (movs ?? []) as Mov[]) {
    const t = m.tipo as string;
    if (t === "gasto_directo" || t === "reparto_recibido") {
      const mes = new Date(m.fecha).getUTCMonth();
      costosPorMes[mes] += Number(m.monto);
    }
  }

  // Watts pico instalados en proyectos PSE en el año por mes (basado en fecha_fin_planeado o fecha_contrato)
  const centroSelected = centros.find((c) => c.id === centroId);
  const empresaCentro = centroSelected?.empresa_id;
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select(
      "fecha_contrato, fecha_fin_planeado, capacidad_kwp, estado, activo, empresa_id",
    )
    .eq("empresa_id", empresaCentro ?? "")
    .gte("fecha_contrato", inicio)
    .lt("fecha_contrato", fin);

  const watts = new Array(12).fill(0);
  for (const p of (proyectos ?? []) as Array<{
    fecha_contrato: string | null;
    capacidad_kwp: number | null;
    estado: string;
  }>) {
    if (!p.fecha_contrato || !p.capacidad_kwp) continue;
    const estadoOk =
      p.estado === "en_ejecucion" ||
      p.estado === "en_cierre" ||
      p.estado === "entregado" ||
      p.estado === "en_om" ||
      p.estado === "cerrado";
    if (!estadoOk) continue;
    const mes = new Date(p.fecha_contrato).getUTCMonth();
    watts[mes] += Number(p.capacidad_kwp) * 1000; // kWp → Wp
  }

  const filas = NOMBRES_MESES.map((nombre, i) => {
    const costo = costosPorMes[i];
    const w = watts[i];
    const dpw = w > 0 ? costo / w : 0;
    return { mes: i + 1, nombre, costo, watts: w, dpw };
  });

  const costoTotal = costosPorMes.reduce((a, b) => a + b, 0);
  const wattsTotal = watts.reduce((a, b) => a + b, 0);
  const dpwAnio = wattsTotal > 0 ? costoTotal / wattsTotal : 0;
  const benchmark = 1.8; // MXN/Wp

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Reportes · Centros
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Eficiencia $/Wp · Ingeniería
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Costo del centro / watts pico instalados (proyectos en estado
          en_ejecucion o posterior con capacidad declarada). Benchmark
          referencial: ${benchmark.toFixed(2)} MXN/Wp.
        </p>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="centro" className="text-xs font-medium">
            Centro
          </label>
          <select
            id="centro"
            name="centro"
            defaultValue={centroId}
            className="flex h-9 w-72 rounded-md border border-input bg-background px-2 text-sm"
          >
            {centros.map((c) => {
              const emp = c.empresas as { codigo?: string } | null;
              return (
                <option key={c.id} value={c.id}>
                  {emp?.codigo} · {c.codigo} — {c.nombre}
                </option>
              );
            })}
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

      {/* KPIs anuales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Costo total" value={fmt(costoTotal)} tone="warn" />
        <Stat
          label="Watts pico"
          value={`${(wattsTotal / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} kWp`}
        />
        <Stat
          label="$/Wp anual"
          value={dpwAnio > 0 ? `$${dpwAnio.toFixed(3)}` : "—"}
          tone={
            dpwAnio === 0
              ? undefined
              : dpwAnio <= benchmark
                ? "ok"
                : "bad"
          }
        />
        <Stat
          label="Δ vs benchmark"
          value={
            dpwAnio === 0
              ? "—"
              : `${dpwAnio > benchmark ? "+" : ""}${(((dpwAnio - benchmark) / benchmark) * 100).toFixed(1)}%`
          }
          tone={
            dpwAnio === 0
              ? undefined
              : dpwAnio <= benchmark
                ? "ok"
                : "bad"
          }
        />
      </div>

      {/* Tabla mensual */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Detalle mensual {anio}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Mes</th>
                <th className="px-4 py-2 text-right font-medium">Costo</th>
                <th className="px-4 py-2 text-right font-medium">Watts pico</th>
                <th className="px-4 py-2 text-right font-medium">$/Wp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((f) => (
                <tr key={f.mes} className="hover:bg-secondary/30">
                  <td className="px-4 py-2 text-xs uppercase">{f.nombre}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                    {fmt(f.costo)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                    {f.watts > 0
                      ? `${(f.watts / 1000).toFixed(1)} kWp`
                      : "—"}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-mono text-xs tabular-nums ${
                      f.dpw === 0
                        ? "text-muted-foreground"
                        : f.dpw <= benchmark
                          ? "text-emerald-700"
                          : "text-rose-700"
                    }`}
                  >
                    {f.dpw > 0 ? `$${f.dpw.toFixed(3)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Tip: el cálculo asume 1 kWp = 1000 Wp. La capacidad sale de
        proyectos.capacidad_kwp y los costos de centros_movimientos
        (gasto_directo + reparto_recibido). Solo cuentan proyectos con estado
        ≥ en_ejecucion en el año seleccionado por fecha de contrato.
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
