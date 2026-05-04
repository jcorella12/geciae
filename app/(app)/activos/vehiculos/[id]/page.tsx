import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Stat } from "@/components/ui/stat";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  COLOR_ESTATUS_VEHICULO,
  ETIQUETA_ESTATUS_VEHICULO,
  ETIQUETA_EVENTO_VEHICULO,
  ETIQUETA_PROPIEDAD,
  type EstatusVehiculo,
  type TipoEventoVehiculo,
  type TipoPropiedadVehiculo,
} from "@/lib/vehiculos/state";

import { BitacoraForm } from "./bitacora-form";
import { DocumentosVehiculoPanel } from "./documentos/documentos-panel";

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
});

export default async function VehiculoDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: vh } = await supabase
    .from("vehiculos")
    .select(
      "*, empresas(codigo, razon_social), proveedores(razon_social)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!vh) notFound();

  const puedeEditar =
    esCEO(v) || esRolEn(v, vh.empresa_id, ["director", "operativo"]);

  const { data: bitacora } = await supabase
    .from("vehiculos_bitacora")
    .select(
      "id, fecha, tipo, descripcion, litros, precio_por_litro, monto, iva, proveedor_nombre, km_lectura, km_recorridos, observaciones, created_at",
    )
    .eq("vehiculo_id", params.id)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const { data: documentosRaw } = await supa
    .from("vehiculos_documentos")
    .select(
      "id, categoria, nombre, descripcion, numero_documento, emisor, fecha_emision, fecha_vencimiento, monto, storage_path, mime_type, tamano_bytes, subido_por_nombre, created_at",
    )
    .eq("vehiculo_id", params.id)
    .order("fecha_vencimiento", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentos = (documentosRaw ?? []) as any[];

  const empresa = vh.empresas as
    | { codigo: string; razon_social: string }
    | null;
  const proveedor = vh.proveedores as { razon_social: string } | null;
  const estatus = vh.estatus as EstatusVehiculo;

  // Calcular gasto últimos 12 meses
  const hace12m = new Date();
  hace12m.setMonth(hace12m.getMonth() - 12);
  const bita12m = (bitacora ?? []).filter(
    (b) => new Date(b.fecha as string) >= hace12m,
  );
  const gastoTotal = bita12m.reduce((a, b) => a + Number(b.monto ?? 0), 0);
  const combustible12m = bita12m
    .filter((b) => b.tipo === "carga_combustible")
    .reduce((a, b) => a + Number(b.monto ?? 0), 0);
  const litros12m = bita12m
    .filter((b) => b.tipo === "carga_combustible")
    .reduce((a, b) => a + Number(b.litros ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/activos/vehiculos"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Vehículos
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-[26px] font-semibold leading-tight">
                {(vh.placa as string) ?? (vh.numero_economico as string) ?? "—"}
              </h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium ${COLOR_ESTATUS_VEHICULO[estatus]}`}
              >
                {ETIQUETA_ESTATUS_VEHICULO[estatus]}
              </span>
            </div>
            <p className="mt-1.5 text-base font-medium">
              {vh.marca as string} {vh.modelo as string} {vh.anio as number}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {empresa && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${empresaCodigoColor[empresa.codigo] ?? "bg-muted-foreground"}`}
                    />
                    {empresa.codigo} · {empresa.razon_social}
                  </span>
                </>
              )}
            </p>
          </div>
          {puedeEditar && (
            <Link
              href={`/activos/vehiculos/${params.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-bg-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Link>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <Stat
          label="Km actual"
          value={
            vh.km_actual != null
              ? Number(vh.km_actual).toLocaleString("es-MX")
              : "—"
          }
        />
        <Stat label="Gasto 12m" value={fmtMxn.format(gastoTotal)} />
        <Stat
          label="Combustible 12m"
          value={fmtMxn.format(combustible12m)}
          sub={`${litros12m.toFixed(0)} L`}
        />
        <Stat
          label="Mensualidad"
          value={
            vh.gasto_recurrente_id
              ? "Vinculada"
              : "—"
          }
          sub={ETIQUETA_PROPIEDAD[
            vh.tipo_propiedad as TipoPropiedadVehiculo
          ] ?? (vh.tipo_propiedad as string)}
        />
      </div>

      {/* Detalles */}
      <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Detalles</h2>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
          {vh.numero_economico && (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Núm. económico
              </dt>
              <dd className="mt-0.5 font-mono">{vh.numero_economico as string}</dd>
            </div>
          )}
          {vh.serie && (
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                VIN / Serie
              </dt>
              <dd className="mt-0.5 font-mono text-xs">{vh.serie as string}</dd>
            </div>
          )}
          {vh.color && (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Color
              </dt>
              <dd className="mt-0.5">{vh.color as string}</dd>
            </div>
          )}
          {vh.combustible && (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Combustible
              </dt>
              <dd className="mt-0.5 capitalize">
                {(vh.combustible as string).replace("_", " ")}
              </dd>
            </div>
          )}
          {vh.uso && (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Uso
              </dt>
              <dd className="mt-0.5">{vh.uso as string}</dd>
            </div>
          )}
          {proveedor && (
            <div className="col-span-3">
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Proveedor (arrendadora)
              </dt>
              <dd className="mt-0.5">{proveedor.razon_social}</dd>
            </div>
          )}
          {vh.fecha_termino_contrato && (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Vence contrato
              </dt>
              <dd className="mt-0.5">
                {new Date(
                  vh.fecha_termino_contrato as string,
                ).toLocaleDateString("es-MX")}
              </dd>
            </div>
          )}
          {vh.poliza_seguro && (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Póliza seguro
              </dt>
              <dd className="mt-0.5 font-mono text-xs">
                {vh.poliza_seguro as string}
              </dd>
            </div>
          )}
          {vh.fecha_vencimiento_seguro && (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Vence seguro
              </dt>
              <dd className="mt-0.5">
                {new Date(
                  vh.fecha_vencimiento_seguro as string,
                ).toLocaleDateString("es-MX")}
              </dd>
            </div>
          )}
          {vh.observaciones && (
            <div className="col-span-3">
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Observaciones
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap">
                {vh.observaciones as string}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Documentos */}
      <div className="mb-6">
        <DocumentosVehiculoPanel
          vehiculoId={params.id}
          documentos={documentos}
          puedeEditar={puedeEditar}
        />
      </div>

      {/* Bitácora */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Bitácora ({bitacora?.length ?? 0})
          </h2>
        </div>

        {puedeEditar && (
          <div className="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-medium">Registrar evento</h3>
            <BitacoraForm
              vehiculoId={params.id}
              kmActual={vh.km_actual as number}
            />
          </div>
        )}

        {(bitacora ?? []).length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-ink-3">
            Sin eventos registrados.
          </p>
        ) : (
          <TableSurface>
            <Table>
              <TableHeader>
                <TableRow interactive={false}>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead align="right">Km</TableHead>
                  <TableHead align="right">Litros</TableHead>
                  <TableHead align="right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(bitacora ?? []).map((b) => {
                  const tipo = b.tipo as TipoEventoVehiculo;
                  return (
                    <TableRow key={b.id as string}>
                      <TableCell className="text-xs text-ink-3">
                        {new Date(b.fecha as string).toLocaleDateString(
                          "es-MX",
                          { day: "numeric", month: "short", year: "2-digit" },
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {ETIQUETA_EVENTO_VEHICULO[tipo] ?? (tipo as string)}
                      </TableCell>
                      <TableCell>
                        <p className="text-[12.5px]">{b.descripcion as string}</p>
                        {b.proveedor_nombre && (
                          <p className="text-[10.5px] text-ink-3">
                            {b.proveedor_nombre as string}
                          </p>
                        )}
                      </TableCell>
                      <TableCell align="right" mono className="text-xs">
                        {b.km_lectura != null
                          ? Number(b.km_lectura).toLocaleString("es-MX")
                          : "—"}
                      </TableCell>
                      <TableCell align="right" mono className="text-xs">
                        {b.litros != null ? Number(b.litros).toFixed(2) : "—"}
                      </TableCell>
                      <TableCell align="right" mono className="text-xs">
                        {b.monto != null
                          ? fmtMxn.format(Number(b.monto))
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableSurface>
        )}
      </section>
    </div>
  );
}
