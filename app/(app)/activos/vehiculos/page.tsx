import { AlertTriangle, Car, Plus } from "lucide-react";
import Link from "next/link";

import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  COLOR_ESTATUS_VEHICULO,
  ETIQUETA_ESTATUS_VEHICULO,
  ETIQUETA_PROPIEDAD,
  type EstatusVehiculo,
  type TipoPropiedadVehiculo,
} from "@/lib/vehiculos/state";

import { SubirReporteGasolinaButton } from "./subir-reporte-gasolina";

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
  maximumFractionDigits: 0,
});

type SearchParams = {
  empresa?: string;
  estatus?: string;
};

export default async function VehiculosPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  await obtenerVinculos();

  const sp = searchParams ?? {};
  const empresaFiltro = sp.empresa ?? "";
  const estatusFiltro = sp.estatus ?? "";

  let query = supabase
    .from("v_vehiculos_lista")
    .select("*")
    .order("estatus")
    .order("placa");

  if (empresaFiltro) query = query.eq("empresa_id", empresaFiltro);
  if (estatusFiltro)
    query = query.eq(
      "estatus",
      estatusFiltro as "activo" | "mantenimiento" | "reparacion" | "fuera_servicio" | "baja",
    );

  const { data: vehiculos, error } = await query;
  const lista = vehiculos ?? [];

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo")
    .eq("activa", true)
    .order("codigo");

  // KPIs
  const activos = lista.filter((v) => v.estatus === "activo").length;
  const totalGasto12m = lista.reduce((a, v) => a + Number(v.gasto_12m ?? 0), 0);
  const totalCombustible12m = lista.reduce(
    (a, v) => a + Number(v.combustible_12m ?? 0),
    0,
  );
  const _totalMantenimiento12m = lista.reduce(
    (a, v) => a + Number(v.mantenimiento_12m ?? 0),
    0,
  );
  const arrendados = lista.filter(
    (v) =>
      (v.tipo_propiedad as string) !== "propio" &&
      (v.tipo_propiedad as string) !== "comodato",
  ).length;

  // Alertas: seguro vencido / próximo a vencer (30d)
  const hoy = new Date();
  const en30d = new Date();
  en30d.setDate(en30d.getDate() + 30);
  const segurosPorVencer = lista.filter((v) => {
    if (!v.fecha_vencimiento_seguro) return false;
    const f = new Date(v.fecha_vencimiento_seguro as string);
    return f >= hoy && f <= en30d;
  });
  const segurosVencidos = lista.filter((v) => {
    if (!v.fecha_vencimiento_seguro) return false;
    return new Date(v.fecha_vencimiento_seguro as string) < hoy;
  });

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Activos</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Vehículos
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Flota del grupo (propios + arrendados). Bitácora kilometraje,
            combustible, mantenimientos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton tipo="vehiculos" />
          <SubirReporteGasolinaButton />
          <Link href="/activos/vehiculos/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo vehículo
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Vehículos activos"
          value={String(activos)}
          sub={`${lista.length} total · ${arrendados} arrendados`}
          accent="ok"
        />
        <KpiCard
          label="Gasto 12m"
          value={fmtMxn.format(totalGasto12m)}
          sub="Combustible + mantenimiento + multas"
          accent="warn"
        />
        <KpiCard
          label="Combustible 12m"
          value={fmtMxn.format(totalCombustible12m)}
          sub={
            totalGasto12m > 0
              ? `${((totalCombustible12m / totalGasto12m) * 100).toFixed(0)}% del gasto`
              : "—"
          }
        />
        <KpiCard
          label="Alertas seguros"
          value={String(segurosVencidos.length + segurosPorVencer.length)}
          sub={`${segurosVencidos.length} vencidos · ${segurosPorVencer.length} en ≤30d`}
          accent={segurosVencidos.length > 0 ? "danger" : "warn"}
        />
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 shadow-xs">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 mr-2">
          Empresa
        </span>
        <Link
          href={`/activos/vehiculos${estatusFiltro ? `?estatus=${estatusFiltro}` : ""}`}
          className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${!empresaFiltro ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
        >
          Todas
        </Link>
        {(empresas ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/activos/vehiculos?empresa=${e.id}${estatusFiltro ? `&estatus=${estatusFiltro}` : ""}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium ${empresaFiltro === e.id ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"} ${empresaFiltro === e.id ? "bg-white" : ""}`}
            />
            {e.codigo}
          </Link>
        ))}
        <span className="ml-3 text-ink-5">·</span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Estatus
        </span>
        <Link
          href={`/activos/vehiculos${empresaFiltro ? `?empresa=${empresaFiltro}` : ""}`}
          className={`rounded-md px-2 py-1 text-[11px] font-medium ${!estatusFiltro ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
        >
          Todos
        </Link>
        {(["activo", "mantenimiento", "reparacion", "fuera_servicio"] as EstatusVehiculo[]).map(
          (s) => (
            <Link
              key={s}
              href={`/activos/vehiculos?estatus=${s}${empresaFiltro ? `&empresa=${empresaFiltro}` : ""}`}
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${estatusFiltro === s ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
            >
              {ETIQUETA_ESTATUS_VEHICULO[s]}
            </Link>
          ),
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Error: {error.message}
        </div>
      )}

      {lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          <Car className="mx-auto mb-3 h-6 w-6 text-ink-4" />
          <p>Sin vehículos capturados.</p>
          <Link
            href="/activos/vehiculos/nuevo"
            className="mt-2 inline-block text-brand hover:underline"
          >
            Capturar el primero →
          </Link>
        </div>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Empresa</TableHead>
                <TableHead>Identificación</TableHead>
                <TableHead>Marca / Modelo</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead align="right">Km actual</TableHead>
                <TableHead align="right">Gasto 12m</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead>Vence seguro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((v) => {
                const codigo = v.empresa_codigo as string;
                const estatus = v.estatus as EstatusVehiculo;
                const fechaSeguro = v.fecha_vencimiento_seguro as string | null;
                const seguroVencido =
                  fechaSeguro && new Date(fechaSeguro) < hoy;
                const seguroProximo =
                  fechaSeguro &&
                  new Date(fechaSeguro) >= hoy &&
                  new Date(fechaSeguro) <= en30d;
                return (
                  <TableRow
                    key={v.id as string}
                    href={`/activos/vehiculos/${v.id}`}
                    linkLabel={`Abrir vehículo ${v.placa ?? v.numero_economico ?? ""}`}
                  >
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${empresaCodigoColor[codigo] ?? "bg-muted-foreground"}`}
                        />
                        {codigo}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-medium">
                        {(v.placa as string) ?? (v.numero_economico as string) ?? "—"}
                      </span>
                      {v.numero_economico && v.placa && (
                        <p className="text-[10px] text-ink-3">
                          #{v.numero_economico as string}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {v.marca as string} {v.modelo as string}
                      </p>
                      <p className="text-[11px] text-ink-3">
                        {v.anio as number} · {v.color as string}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {ETIQUETA_PROPIEDAD[
                        v.tipo_propiedad as TipoPropiedadVehiculo
                      ] ?? (v.tipo_propiedad as string)}
                      {Number(v.mensualidad_arrendamiento ?? 0) > 0 && (
                        <p className="font-mono text-[10px] text-ink-3">
                          {fmtMxn.format(
                            Number(v.mensualidad_arrendamiento),
                          )}
                          /mes
                        </p>
                      )}
                    </TableCell>
                    <TableCell align="right" mono>
                      {v.km_actual != null
                        ? Number(v.km_actual).toLocaleString("es-MX")
                        : "—"}
                    </TableCell>
                    <TableCell align="right" mono className="text-xs">
                      {fmtMxn.format(Number(v.gasto_12m ?? 0))}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTATUS_VEHICULO[estatus]}`}
                      >
                        {ETIQUETA_ESTATUS_VEHICULO[estatus]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {fechaSeguro ? (
                        <span
                          className={`text-[11.5px] ${
                            seguroVencido
                              ? "text-red-700 font-medium"
                              : seguroProximo
                                ? "text-amber-700"
                                : "text-ink-3"
                          }`}
                        >
                          {(seguroVencido || seguroProximo) && (
                            <AlertTriangle className="mr-0.5 inline-block h-2.5 w-2.5" />
                          )}
                          {new Date(fechaSeguro).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-4">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </div>
  );
}
