import Link from "next/link";
import { redirect } from "next/navigation";

import {
  obtenerVinculos,
  puedeAccederCentros,
} from "@/lib/auth/permisos";
import { listarCentrosActivos } from "@/lib/centros/listar";
import { createClient } from "@/lib/supabase/server";

import { ListaConBulk } from "./bulk-form";

export const dynamic = "force-dynamic";

// Etiquetas y colores se usan en bulk-form.tsx (cliente).

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
  const centros = await listarCentrosActivos();

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

      {/* Tabla con bulk selection */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Transacciones ({lista.length})
        </h2>
        <ListaConBulk
          rows={lista.map((r) => ({
            tipo: r.tipo,
            id: r.id,
            empresa_id: r.empresa_id,
            numero: r.numero,
            monto: r.monto != null ? Number(r.monto) : null,
            alias:
              empresaPorId.get(r.empresa_id)?.codigo ??
              undefined,
          }))}
          centros={centros}
        />
      </section>

      <p className="text-xs text-muted-foreground">
        Tip: filtra primero por empresa para que la barra bulk pueda asignar a
        un centro. Los más altos primero para mayor impacto.
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
