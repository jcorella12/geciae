import Link from "next/link";
import { redirect } from "next/navigation";

import {
  obtenerVinculos,
  puedeAccederCentros,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const ETIQUETA_TIPO: Record<string, string> = {
  oc: "Orden de compra",
  ot: "Orden de trabajo inter-co",
  cfdi: "CFDI",
  gasto_recurrente: "Gasto recurrente",
};

const COLOR_TIPO: Record<string, string> = {
  oc: "bg-blue-100 text-blue-700",
  ot: "bg-violet-100 text-violet-700",
  cfdi: "bg-emerald-100 text-emerald-700",
  gasto_recurrente: "bg-amber-100 text-amber-700",
};

const URL_TIPO: Record<string, (id: string) => string> = {
  oc: (id) => `/finanzas/oc/${id}`,
  ot: (id) => `/finanzas/ot/${id}`,
  cfdi: (id) => `/finanzas/cfdi/${id}`,
  gasto_recurrente: (id) => `/finanzas/gastos-recurrentes/${id}`,
};

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Sin = {
  tipo: string;
  id: string;
  empresa_id: string;
  numero: string | null;
  fecha: string | null;
  monto: number | null;
  proyecto_id: string | null;
  estado: string;
};

export default async function LimpiezaCentrosPage({
  searchParams,
}: {
  searchParams?: { tipo?: string; empresa?: string };
}) {
  const vinculos = await obtenerVinculos();
  if (!puedeAccederCentros(vinculos)) redirect("/mi-dia");

  const supabase = createClient();

  const { data: rows } = await (
    supabase.from("v_transacciones_sin_centro" as never) as unknown as {
      select: (cols: string) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => {
          limit: (n: number) => Promise<{ data: Sin[] | null }>;
        };
      };
    }
  )
    .select("*")
    .order("monto", { ascending: false })
    .limit(500);

  let lista = rows ?? [];

  if (searchParams?.tipo) {
    lista = lista.filter((r) => r.tipo === searchParams.tipo);
  }
  if (searchParams?.empresa) {
    lista = lista.filter((r) => r.empresa_id === searchParams.empresa);
  }

  // Empresas para etiqueta
  const empresasIds = Array.from(new Set(lista.map((r) => r.empresa_id)));
  const { data: empresas } = empresasIds.length
    ? await supabase
        .from("empresas")
        .select("id, codigo, nombre_comercial")
        .in("id", empresasIds)
    : { data: [] as Array<{ id: string; codigo: string; nombre_comercial: string | null }> };
  const empresaPorId = new Map((empresas ?? []).map((e) => [e.id, e]));

  // Conteos por tipo
  const conteo: Record<string, number> = {
    oc: 0,
    ot: 0,
    cfdi: 0,
    gasto_recurrente: 0,
  };
  let montoTotal = 0;
  for (const r of rows ?? []) {
    conteo[r.tipo] = (conteo[r.tipo] ?? 0) + 1;
    montoTotal += Number(r.monto ?? 0);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/configuracion/centros"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a centros
        </Link>
        <p className="mt-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Configuración · Centros
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Limpieza progresiva
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Transacciones financieramente relevantes (aprobadas, ejecutadas,
          timbradas) que aún no tienen centro asignado. Click en el número
          lleva al detalle para asignarlo manualmente.
        </p>
      </div>

      {/* KPIs por tipo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total sin centro" value={String((rows ?? []).length)} />
        <Stat label="Monto total" value={fmt(montoTotal)} tone="warn" />
        <Stat label="OCs" value={String(conteo.oc)} />
        <Stat label="OTs" value={String(conteo.ot)} />
        <Stat label="Gastos rec." value={String(conteo.gasto_recurrente)} />
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="tipo" className="text-xs font-medium">
            Tipo
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={searchParams?.tipo ?? ""}
            className="flex h-9 w-44 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="oc">Órdenes de compra</option>
            <option value="ot">Órdenes de trabajo</option>
            <option value="cfdi">CFDI</option>
            <option value="gasto_recurrente">Gastos recurrentes</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="empresa" className="text-xs font-medium">
            Empresa
          </label>
          <select
            id="empresa"
            name="empresa"
            defaultValue={searchParams?.empresa ?? ""}
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
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Filtrar
        </button>
      </form>

      {/* Tabla */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Transacciones ({lista.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Número</th>
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 text-right font-medium">Monto</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((r) => {
                const emp = empresaPorId.get(r.empresa_id);
                const url = URL_TIPO[r.tipo]
                  ? URL_TIPO[r.tipo](r.id)
                  : null;
                return (
                  <tr key={r.tipo + r.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${COLOR_TIPO[r.tipo] ?? "bg-secondary"}`}
                      >
                        {ETIQUETA_TIPO[r.tipo] ?? r.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            codigoColor[emp?.codigo ?? ""] ??
                            "bg-muted-foreground"
                          }`}
                        />
                        <span className="font-medium">{emp?.codigo ?? "?"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {url ? (
                        <Link
                          href={url}
                          className="hover:text-primary hover:underline"
                        >
                          {r.numero ?? r.id.slice(0, 8)}
                        </Link>
                      ) : (
                        (r.numero ?? r.id.slice(0, 8))
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{r.fecha ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                      {r.monto != null ? fmt(Number(r.monto)) : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {r.estado}
                    </td>
                  </tr>
                );
              })}
              {lista.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Sin transacciones pendientes. ✓ Buen trabajo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Tip: ordena los más altos primero para alto impacto. La asignación
        bulk con checkboxes está pendiente para iteración futura.
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
  tone?: "warn";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
          tone === "warn" ? "text-amber-700" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
