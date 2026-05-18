import { Plus, ShieldCheck, ShieldAlert, Box } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { createClient } from "@/lib/supabase/server";

import { ESTADOS_SERIE, type EstadoSerie } from "./state";

export const dynamic = "force-dynamic";

const fmtFecha = (d: string | null) => {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y.slice(2)}`;
};

const estadoBadge = (e: string | null) => {
  const s = ESTADOS_SERIE.find((x) => x.value === e);
  return s?.badge ?? "bg-secondary text-foreground";
};
const estadoLabel = (e: string | null) =>
  ESTADOS_SERIE.find((x) => x.value === e)?.label ?? e ?? "—";

const garantiaBadge = (g: string | null) => {
  switch (g) {
    case "vigente":
      return "bg-emerald-100 text-emerald-800";
    case "por_vencer":
      return "bg-amber-100 text-amber-800";
    case "vencida":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
};
const garantiaLabel = (g: string | null) => {
  switch (g) {
    case "vigente":
      return "Vigente";
    case "por_vencer":
      return "Por vencer";
    case "vencida":
      return "Vencida";
    default:
      return "Sin garantía";
  }
};

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: { q?: string; estado?: string; garantia?: string };
}) {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("v_productos_serie_lista")
    .select("*")
    .order("created_at", { ascending: false });

  if (searchParams.estado && searchParams.estado !== "todos") {
    query = query.eq("estado", searchParams.estado);
  }
  if (searchParams.garantia && searchParams.garantia !== "todos") {
    query = query.eq("estado_garantia", searchParams.garantia);
  }

  const { data: filas } = (await query) as {
    data: Array<{
      id: string;
      numero_serie: string;
      estado: EstadoSerie | null;
      fecha_compra: string | null;
      fecha_instalacion: string | null;
      garantia_inicio: string | null;
      garantia_fin: string | null;
      ubicacion_actual: string | null;
      producto_codigo: string;
      producto_nombre: string;
      producto_marca: string | null;
      almacen_codigo: string | null;
      almacen_nombre: string | null;
      proyecto_codigo: string | null;
      proyecto_nombre: string | null;
      cliente_razon_social: string | null;
      estado_garantia: string | null;
      dias_garantia_restantes: number | null;
    }> | null;
  };

  const lista = filas ?? [];
  const filtradas = searchParams.q
    ? lista.filter((s) => {
        const q = searchParams.q!.toLowerCase();
        return (
          s.numero_serie.toLowerCase().includes(q) ||
          s.producto_codigo.toLowerCase().includes(q) ||
          s.producto_nombre.toLowerCase().includes(q) ||
          (s.proyecto_nombre ?? "").toLowerCase().includes(q) ||
          (s.cliente_razon_social ?? "").toLowerCase().includes(q)
        );
      })
    : lista;

  // KPIs
  const total = filtradas.length;
  const enAlmacen = filtradas.filter((s) => s.estado === "en_almacen").length;
  const instalados = filtradas.filter(
    (s) => s.estado === "instalado",
  ).length;
  const garantiaPorVencer = filtradas.filter(
    (s) => s.estado_garantia === "por_vencer",
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="lbl-mini">Inventario</p>
          <h1 className="mt-1.5 flex items-center gap-2 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            <Box className="h-6 w-6" />
            Productos con número de serie
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {total} serie{total === 1 ? "" : "s"} · {enAlmacen} en almacén ·{" "}
            {instalados} instaladas · {garantiaPorVencer} con garantía por
            vencer
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/inventario">← Inventario</Link>
          </Button>
          <Button asChild>
            <Link href="/inventario/series/nueva">
              <Plus className="h-4 w-4" />
              Registrar series
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total registradas" value={total} sub="Histórico" />
        <KpiCard
          label="En almacén"
          value={enAlmacen}
          sub="Disponibles para asignar"
        />
        <KpiCard label="Instaladas" value={instalados} sub="En sitio cliente" />
        <KpiCard
          label="Garantía por vencer"
          value={garantiaPorVencer}
          sub="Próximos 30 días"
        />
      </div>

      {/* Filtros */}
      <form
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-card px-4 py-3"
        action="/inventario/series"
      >
        <div className="flex-1 min-w-[220px]">
          <label
            htmlFor="q"
            className="block text-[10.5px] uppercase tracking-wide text-ink-3"
          >
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Número de serie, producto, proyecto, cliente…"
            className="mt-1 flex h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="estado"
            className="block text-[10.5px] uppercase tracking-wide text-ink-3"
          >
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={searchParams.estado ?? "todos"}
            className="mt-1 flex h-9 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="todos">Todos</option>
            {ESTADOS_SERIE.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="garantia"
            className="block text-[10.5px] uppercase tracking-wide text-ink-3"
          >
            Garantía
          </label>
          <select
            id="garantia"
            name="garantia"
            defaultValue={searchParams.garantia ?? "todos"}
            className="mt-1 flex h-9 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="todos">Todas</option>
            <option value="vigente">Vigente</option>
            <option value="por_vencer">Por vencer (30 d)</option>
            <option value="vencida">Vencida</option>
            <option value="sin_garantia">Sin garantía</option>
          </select>
        </div>
        <Button type="submit" size="sm" variant="outline">
          Aplicar
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Número serie</th>
              <th className="px-4 py-2 font-medium">Producto</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Ubicación</th>
              <th className="px-4 py-2 font-medium">Cliente / Proyecto</th>
              <th className="px-4 py-2 font-medium">Garantía</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtradas.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Sin series registradas. Click en &quot;Registrar series&quot;
                  para empezar (típicamente al recibir una OC con paneles o
                  inversores).
                </td>
              </tr>
            ) : (
              filtradas.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/inventario/series/${s.id}`}
                      className="font-mono text-[13px] font-semibold hover:text-primary hover:underline"
                    >
                      {s.numero_serie}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-[13px]">
                      {s.producto_nombre}
                    </div>
                    <div className="text-[11px] text-ink-3">
                      <code className="font-mono">{s.producto_codigo}</code>
                      {s.producto_marca && ` · ${s.producto_marca}`}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${estadoBadge(s.estado)}`}
                    >
                      {estadoLabel(s.estado)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px]">
                    {s.almacen_codigo && (
                      <span className="text-ink-3">
                        <code className="font-mono">{s.almacen_codigo}</code>{" "}
                        {s.almacen_nombre}
                      </span>
                    )}
                    {s.ubicacion_actual && (
                      <div className="text-[11px] text-ink-3">
                        {s.ubicacion_actual}
                      </div>
                    )}
                    {!s.almacen_codigo && !s.ubicacion_actual && "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[12px]">
                    {s.cliente_razon_social && (
                      <div className="font-medium">
                        {s.cliente_razon_social}
                      </div>
                    )}
                    {s.proyecto_codigo && (
                      <div className="text-[11px] text-ink-3">
                        <code className="font-mono">{s.proyecto_codigo}</code>{" "}
                        {s.proyecto_nombre}
                      </div>
                    )}
                    {!s.cliente_razon_social && !s.proyecto_codigo && "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {s.estado_garantia === "vencida" ? (
                        <ShieldAlert className="h-3.5 w-3.5 text-red-700" />
                      ) : s.estado_garantia === "vigente" ||
                        s.estado_garantia === "por_vencer" ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${garantiaBadge(s.estado_garantia)}`}
                      >
                        {garantiaLabel(s.estado_garantia)}
                      </span>
                    </div>
                    {s.garantia_fin && (
                      <div className="mt-0.5 font-mono text-[10.5px] text-ink-3">
                        Vence {fmtFecha(s.garantia_fin)}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
