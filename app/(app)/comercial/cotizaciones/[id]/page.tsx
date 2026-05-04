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
import { esCEO, esRolEn, obtenerVinculos, tieneAtributo } from "@/lib/auth/permisos";
import {
  COLOR_ESTADO_COTIZACION,
  ETIQUETA_ESTADO_COTIZACION,
  type EstadoCotizacion,
} from "@/lib/cotizaciones/state";
import { createClient } from "@/lib/supabase/server";

import { CotizacionAcciones } from "./cotizacion-acciones";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

export default async function CotizacionDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: c }, vinculos] = await Promise.all([
    supabase
      .from("cotizaciones")
      .select(
        "id, empresa_id, cliente_id, oportunidad_id, numero, version, fecha_emision, fecha_vencimiento, vigencia_dias, subtotal, descuento, iva, retenciones, total, estado, condiciones_pago, notas, enviada_a_cliente, fecha_envio, vista_por_cliente, fecha_vista_cliente, fecha_aceptacion, aprobada_internamente, aprobada_por, origen, created_at, empresas(codigo, razon_social, nombre_comercial), clientes(razon_social, rfc, nombre_comercial)",
      )
      .eq("id", params.id)
      .maybeSingle(),
    obtenerVinculos(),
  ]);

  if (!c) notFound();

  const { data: conceptos } = await supabase
    .from("cotizaciones_conceptos")
    .select("*")
    .eq("cotizacion_id", params.id)
    .order("orden");

  // Versiones del mismo número
  const { data: versiones } = await supabase
    .from("cotizaciones")
    .select("id, version, estado, fecha_emision, total")
    .eq("empresa_id", c.empresa_id)
    .eq("numero", c.numero)
    .order("version", { ascending: false });

  // Estado computado: vencida si pasó la fecha
  const hoy = new Date().toISOString().slice(0, 10);
  const estadoBase = c.estado as EstadoCotizacion;
  const esVencida =
    (estadoBase === "borrador" || estadoBase === "enviada") &&
    c.fecha_vencimiento != null &&
    (c.fecha_vencimiento as string) < hoy;
  const estado: EstadoCotizacion = esVencida ? "vencida" : estadoBase;

  const puedeEditar =
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "vendedor") ||
    esRolEn(vinculos, c.empresa_id, ["director", "operativo"]);
  const puedeAprobarInterno =
    esCEO(vinculos) || esRolEn(vinculos, c.empresa_id, "director");

  const empresa = c.empresas as
    | { codigo: string; razon_social: string; nombre_comercial: string | null }
    | null;
  const cliente = c.clientes as
    | { razon_social: string; rfc: string; nombre_comercial: string | null }
    | null;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/comercial/cotizaciones"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Cotizaciones
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold leading-tight">
              {c.numero as string}
            </h1>
            {(c.version as number) > 1 && (
              <span className="rounded-md bg-bg-2 px-2 py-0.5 font-mono text-[11px] text-ink-2">
                v{c.version as number}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium ${
                COLOR_ESTADO_COTIZACION[estado]
              }`}
            >
              {ETIQUETA_ESTADO_COTIZACION[estado]}
            </span>
            {c.aprobada_internamente && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                ✓ Aprobada internamente
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {empresa && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      empresaCodigoColor[empresa.codigo] ??
                      "bg-muted-foreground"
                    }`}
                  />
                  {empresa.razon_social}
                </span>
                <span className="mx-2 text-ink-5">→</span>
              </>
            )}
            {cliente?.razon_social ?? "Cliente desconocido"}
            {cliente?.rfc && (
              <code className="ml-2 font-mono text-[11px] text-ink-3">
                {cliente.rfc}
              </code>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {puedeEditar &&
            (estado === "borrador" || estado === "vencida") && (
              <Link
                href={`/comercial/cotizaciones/${params.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-bg-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Link>
            )}
          <Link
            href={`/api/cotizaciones/${params.id}/data`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-bg-2"
            target="_blank"
          >
            📄 Datos JSON (PDF)
          </Link>
        </div>
      </div>

      {/* Stats principales */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Stat
          label="Subtotal"
          value={fmtMxn.format(Number(c.subtotal ?? 0))}
        />
        <Stat
          label="IVA"
          value={fmtMxn.format(Number(c.iva ?? 0))}
        />
        <Stat
          label="Descuentos"
          value={fmtMxn.format(Number(c.descuento ?? 0))}
        />
        <Stat
          label="Total"
          value={fmtMxn.format(Number(c.total ?? 0))}
          color="var(--brand)"
        />
      </div>

      {/* Acciones de workflow */}
      <div className="mb-6">
        <CotizacionAcciones
          cotizacionId={params.id}
          estado={estado}
          aprobada={Boolean(c.aprobada_internamente)}
          puedeEditar={puedeEditar}
          puedeAprobarInterno={puedeAprobarInterno}
        />
      </div>

      {/* Datos generales */}
      <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Datos generales</h2>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <Field
            label="Fecha emisión"
            value={new Date(c.fecha_emision as string).toLocaleDateString("es-MX")}
          />
          <Field
            label="Vigencia"
            value={`${c.vigencia_dias ?? "—"} días`}
          />
          <Field
            label="Vence"
            value={
              c.fecha_vencimiento
                ? new Date(c.fecha_vencimiento as string).toLocaleDateString(
                    "es-MX",
                  )
                : "—"
            }
            tone={esVencida ? "warn" : undefined}
          />
          <Field
            label="Condiciones de pago"
            value={(c.condiciones_pago as string) ?? "—"}
            colSpan={3}
          />
          {c.fecha_envio && (
            <Field
              label="Enviada al cliente"
              value={new Date(c.fecha_envio as string).toLocaleString("es-MX")}
            />
          )}
          {c.fecha_aceptacion && (
            <Field
              label="Aceptación"
              value={new Date(c.fecha_aceptacion as string).toLocaleDateString(
                "es-MX",
              )}
            />
          )}
          {c.notas && (
            <Field
              label="Notas"
              value={c.notas as string}
              colSpan={3}
            />
          )}
        </dl>
      </section>

      {/* Conceptos */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold">
          Conceptos ({(conceptos ?? []).length})
        </h2>
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>#</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead align="right">Cant.</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead align="right">P. unitario</TableHead>
                <TableHead align="right">Desc.</TableHead>
                <TableHead align="right">IVA</TableHead>
                <TableHead align="right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(conceptos ?? []).map((cc) => (
                <TableRow key={cc.id as string}>
                  <TableCell mono>{cc.orden as number}</TableCell>
                  <TableCell>
                    <p className="text-sm">{cc.descripcion as string}</p>
                    {(cc.clave_sat as string | null) && (
                      <p className="font-mono text-[10px] text-ink-3">
                        SAT: {cc.clave_sat as string}
                      </p>
                    )}
                    {(cc.observaciones as string | null) && (
                      <p className="mt-0.5 text-[11px] text-ink-3">
                        {cc.observaciones as string}
                      </p>
                    )}
                  </TableCell>
                  <TableCell align="right" mono>
                    {Number(cc.cantidad).toFixed(
                      Number(cc.cantidad) % 1 === 0 ? 0 : 2,
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {(cc.unidad_sat as string) ?? "—"}
                  </TableCell>
                  <TableCell align="right" mono>
                    {fmtMxn.format(Number(cc.precio_unitario))}
                  </TableCell>
                  <TableCell align="right" mono>
                    {Number(cc.descuento ?? 0) > 0
                      ? fmtMxn.format(Number(cc.descuento))
                      : "—"}
                  </TableCell>
                  <TableCell align="right" mono>
                    {((Number(cc.iva_tasa ?? 0)) * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell align="right" mono>
                    {fmtMxn.format(Number(cc.importe))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableSurface>
      </section>

      {/* Versiones */}
      {versiones && versiones.length > 1 && (
        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold">
            Versiones de {c.numero as string}
          </h2>
          <TableSurface>
            <Table>
              <TableHeader>
                <TableRow interactive={false}>
                  <TableHead>Versión</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead align="right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versiones.map((v) => {
                  const estadoV = v.estado as EstadoCotizacion;
                  const esActual = v.id === params.id;
                  return (
                    <TableRow key={v.id as string}>
                      <TableCell mono>v{v.version as number}</TableCell>
                      <TableCell className="text-xs text-ink-3">
                        {new Date(
                          v.fecha_emision as string,
                        ).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            COLOR_ESTADO_COTIZACION[estadoV] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {ETIQUETA_ESTADO_COTIZACION[estadoV] ?? estadoV}
                        </span>
                      </TableCell>
                      <TableCell align="right" mono>
                        {fmtMxn.format(Number(v.total ?? 0))}
                      </TableCell>
                      <TableCell>
                        {esActual ? (
                          <span className="text-[11px] text-ink-3">— actual —</span>
                        ) : (
                          <Link
                            href={`/comercial/cotizaciones/${v.id}`}
                            className="text-[11px] text-brand hover:underline"
                          >
                            Ver
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableSurface>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  colSpan = 1,
  tone,
}: {
  label: string;
  value: string;
  colSpan?: number;
  tone?: "warn";
}) {
  return (
    <div className={colSpan === 3 ? "col-span-3" : ""}>
      <dt className="text-[11px] uppercase tracking-wider text-ink-3">
        {label}
      </dt>
      <dd
        className={`mt-0.5 ${
          tone === "warn" ? "font-medium text-amber-700" : "text-ink-1"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
