import { FileText, Plus } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  empresasDondeGestionaEmpleados,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
} from "@/lib/empresa-activa";
import { createClient } from "@/lib/supabase/server";

import { ESTADOS_FINIQUITO, MOTIVOS_BAJA } from "./state";

export const dynamic = "force-dynamic";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const fmtFecha = (d: string | null) => {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y.slice(2)}`;
};

const motivoLabel = (v: string) =>
  MOTIVOS_BAJA.find((m) => m.value === v)?.label ?? v;

const badgeEstado = (estado: string | null) => {
  switch (estado) {
    case "borrador":
      return "bg-slate-100 text-slate-700";
    case "aprobado":
      return "bg-amber-100 text-amber-800";
    case "pagado":
      return "bg-emerald-100 text-emerald-800";
    case "ratificado":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-secondary text-foreground";
  }
};

const labelEstado = (v: string) =>
  ESTADOS_FINIQUITO.find((e) => e.value === v)?.label ?? v;

export default async function FiniquitosPage({
  searchParams,
}: {
  searchParams: { estado?: string; q?: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const empresasGestionables = empresasDondeGestionaEmpleados(vinculos);
  if (empresasGestionables.length === 0) {
    redirect("/personas");
  }

  const cookieValue = cookies().get(EMPRESA_COOKIE)?.value ?? null;
  const empresasUsuario = Array.from(
    new Set(vinculos.map((v) => v.empresa_id)),
  );
  const filtro = resolverEmpresasFiltro({
    cookieValue,
    empresasUsuario,
    puedeConsolidado: puedeVerConsolidado(vinculos),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("finiquitos")
    .select(
      "id, empleado_id, fecha_baja, motivo_baja, camino_cierre, total_neto, fecha_pago, estado, observaciones, created_at, empleados(nombre_completo, numero_empleado, empresa_id, empresas(codigo))",
    )
    .order("created_at", { ascending: false });

  if (searchParams.estado && searchParams.estado !== "todos") {
    query = query.eq("estado", searchParams.estado);
  }
  if (searchParams.q && searchParams.q.trim().length > 0) {
    // Filtro client-side por nombre (Supabase no permite filtrar por join directo aquí fácilmente)
  }

  const { data: filas } = (await query) as {
    data: Array<{
      id: string;
      empleado_id: string;
      fecha_baja: string;
      motivo_baja: string;
      camino_cierre: string | null;
      total_neto: number;
      fecha_pago: string | null;
      estado: string | null;
      observaciones: string | null;
      created_at: string;
      empleados: {
        nombre_completo: string;
        numero_empleado: string;
        empresa_id: string;
        empresas: { codigo: string } | null;
      } | null;
    }> | null;
  };

  // Filtro empresa-visibility en memoria (RLS ya filtra; esta es la
  // segunda barrera para respetar la empresa activa del cookie).
  const lista = (filas ?? []).filter((f) => {
    if (!f.empleados) return false;
    return filtro.empresasIds.includes(f.empleados.empresa_id);
  });

  const filtradas = searchParams.q
    ? lista.filter((f) => {
        const q = searchParams.q!.toLowerCase();
        return (
          (f.empleados?.nombre_completo ?? "").toLowerCase().includes(q) ||
          (f.empleados?.numero_empleado ?? "").toLowerCase().includes(q) ||
          motivoLabel(f.motivo_baja).toLowerCase().includes(q)
        );
      })
    : lista;

  // KPIs
  const enBorrador = filtradas.filter((f) => f.estado === "borrador");
  const aprobados = filtradas.filter((f) => f.estado === "aprobado");
  const pagadosAnio = filtradas.filter((f) => {
    if (f.estado !== "pagado" && f.estado !== "ratificado") return false;
    const ahora = new Date();
    return new Date(f.fecha_baja).getFullYear() === ahora.getFullYear();
  });
  const totalPagadoAnio = pagadosAnio.reduce(
    (acc, f) => acc + Number(f.total_neto ?? 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="lbl-mini">Personas</p>
          <h1 className="mt-1.5 flex items-center gap-2 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            <FileText className="h-6 w-6" />
            Finiquitos
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {filtradas.length} finiquito(s) visibles · {enBorrador.length} en
            borrador · {aprobados.length} aprobados pendientes de pago
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/personas">← Empleados</Link>
          </Button>
          <Button asChild>
            <Link href="/personas/finiquitos/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo finiquito
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="En borrador"
          value={enBorrador.length}
          sub="Esperando revisión"
        />
        <KpiCard
          label="Por pagar"
          value={aprobados.length}
          sub="Aprobados sin transferir"
        />
        <KpiCard
          label={`Pagados ${new Date().getFullYear()}`}
          value={pagadosAnio.length}
          sub="Cerrados este año"
        />
        <KpiCard
          label="Total pagado"
          value={fmtMxn.format(totalPagadoAnio)}
          sub={`${pagadosAnio.length} finiquitos`}
        />
      </div>

      {/* Filtros */}
      <form
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-card px-4 py-3"
        action="/personas/finiquitos"
      >
        <div className="flex-1 min-w-[200px]">
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
            placeholder="Nombre, número, motivo…"
            className="mt-1 flex h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            {ESTADOS_FINIQUITO.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" variant="outline">
          Aplicar
        </Button>
      </form>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">Empleado</th>
              <th className="px-4 py-2 font-medium">Fecha baja</th>
              <th className="px-4 py-2 font-medium">Motivo</th>
              <th className="px-4 py-2 font-medium">Camino</th>
              <th className="px-4 py-2 text-right font-medium">Total neto</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtradas.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Sin finiquitos registrados.
                </td>
              </tr>
            ) : (
              filtradas.map((f) => (
                <tr key={f.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/personas/finiquitos/${f.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      <span className="font-medium">
                        {f.empleados?.nombre_completo ?? "—"}
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                        {f.empleados?.numero_empleado}
                      </span>
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          empresaCodigoColor[
                            f.empleados?.empresas?.codigo ?? ""
                          ] ?? "bg-muted-foreground"
                        }`}
                      />
                      {f.empleados?.empresas?.codigo}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {fmtFecha(f.fecha_baja)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {motivoLabel(f.motivo_baja)}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">
                    {f.camino_cierre ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                    {fmtMxn.format(Number(f.total_neto))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeEstado(f.estado)}`}
                    >
                      {labelEstado(f.estado ?? "")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {fmtFecha(f.fecha_pago)}
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
