import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  COLOR_ESTADO_CFDI,
  ETIQUETA_ESTADO_CFDI,
  ETIQUETA_TIPO_CFDI,
  type EstadoCfdi,
  type TipoCfdi,
} from "@/lib/cfdi/state";
import { createClient } from "@/lib/supabase/server";

import { CfdiActions } from "./cfdi-actions";

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

const MOTIVOS_SAT: Record<string, string> = {
  "01": "01 — Comprobante con errores con relación",
  "02": "02 — Comprobante con errores sin relación",
  "03": "03 — No se llevó a cabo la operación",
  "04": "04 — Operación nominativa en factura global",
};

export default async function CfdiDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: cfdi } = await supabase
    .from("cfdi")
    .select(
      `*,
       empresas(codigo, razon_social, nombre_comercial),
       cliente:clientes(id, razon_social, rfc),
       proveedor:proveedores(id, razon_social, rfc),
       proyecto:proyectos(id, nombre, codigo),
       oc:ordenes_compra(id, numero),
       ot:ordenes_trabajo_inter_co(id, numero)`,
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!cfdi) notFound();

  const { data: conceptos } = await supabase
    .from("cfdi_conceptos")
    .select("*")
    .eq("cfdi_id", params.id)
    .order("orden");

  const v = await obtenerVinculos();
  const puedeOperar =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    esRolEn(v, cfdi.empresa_id, ["director", "operativo"]);

  const emp = cfdi.empresas as { codigo: string; razon_social: string; nombre_comercial: string | null } | null;
  const total = Number(cfdi.total ?? 0);
  const pagado = Number(cfdi.monto_pagado ?? 0);
  const saldo = Number(cfdi.saldo_pendiente ?? total - pagado);
  const estado = cfdi.estado as EstadoCfdi;
  const tipo = cfdi.tipo as TipoCfdi;

  // URL firmada para descargar XML/PDF
  let xmlUrl: string | null = null;
  let pdfUrl: string | null = null;
  if (cfdi.url_xml) {
    const { data } = await supabase.storage
      .from("cfdi")
      .createSignedUrl(cfdi.url_xml, 60 * 60); // 1h
    xmlUrl = data?.signedUrl ?? null;
  }
  if (cfdi.url_pdf) {
    const { data } = await supabase.storage
      .from("cfdi")
      .createSignedUrl(cfdi.url_pdf, 60 * 60);
    pdfUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/cfdi"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← CFDI
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold leading-tight">
            CFDI {cfdi.serie ?? ""}
            {cfdi.folio ?? ""}
          </h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO_CFDI[estado]}`}
          >
            {ETIQUETA_ESTADO_CFDI[estado]}
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">
            {cfdi.es_emitido ? "📤 Emitido" : "📥 Recibido"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="space-y-4 md:col-span-2">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="UUID SAT" value={cfdi.uuid_sat ?? "—"} mono />
              <Field
                label="Tipo"
                value={`${ETIQUETA_TIPO_CFDI[tipo]} (${cfdi.metodo_pago ?? "—"})`}
              />
              <Field
                label="Empresa"
                value={
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        empresaCodigoColor[emp?.codigo ?? ""] ??
                        "bg-muted-foreground"
                      }`}
                    />
                    {emp?.nombre_comercial ?? emp?.razon_social ?? "?"}
                  </span>
                }
              />
              <Field
                label="Fecha emisión"
                value={
                  cfdi.fecha_emision
                    ? new Date(cfdi.fecha_emision).toLocaleString("es-MX")
                    : "—"
                }
              />
              {cfdi.fecha_timbrado && (
                <Field
                  label="Fecha timbrado"
                  value={new Date(cfdi.fecha_timbrado).toLocaleString("es-MX")}
                />
              )}
              <Field
                label="Forma pago"
                value={cfdi.forma_pago ?? "—"}
              />
              <Field label="Uso CFDI" value={cfdi.uso_cfdi ?? "—"} />
              <Field
                label="Moneda"
                value={`${cfdi.moneda} (${cfdi.tipo_cambio})`}
              />
            </div>
            <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Emisor
                </p>
                <p className="mt-0.5 font-medium">
                  {cfdi.nombre_emisor ?? "—"}
                </p>
                <p className="font-mono text-xs">{cfdi.rfc_emisor}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Receptor
                </p>
                <p className="mt-0.5 font-medium">
                  {cfdi.nombre_receptor ?? "—"}
                </p>
                <p className="font-mono text-xs">{cfdi.rfc_receptor}</p>
              </div>
            </div>

            {(cfdi.cliente || cfdi.proveedor || cfdi.proyecto || cfdi.oc || cfdi.ot) && (
              <div className="mt-4 grid gap-2 border-t border-border pt-4 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Vinculaciones
                </p>
                {cfdi.cliente && (
                  <p>
                    Cliente:{" "}
                    <Link
                      href={`/clientes/${(cfdi.cliente as { id: string }).id}`}
                      className="text-primary hover:underline"
                    >
                      {(cfdi.cliente as { razon_social: string }).razon_social}
                    </Link>
                  </p>
                )}
                {cfdi.proveedor && (
                  <p>
                    Proveedor:{" "}
                    <Link
                      href={`/finanzas/proveedores/${(cfdi.proveedor as { id: string }).id}`}
                      className="text-primary hover:underline"
                    >
                      {(cfdi.proveedor as { razon_social: string }).razon_social}
                    </Link>
                  </p>
                )}
                {cfdi.proyecto && (
                  <p>
                    Proyecto:{" "}
                    <Link
                      href={`/proyectos/${(cfdi.proyecto as { id: string }).id}`}
                      className="text-primary hover:underline"
                    >
                      {(cfdi.proyecto as { codigo: string; nombre: string }).codigo} —{" "}
                      {(cfdi.proyecto as { codigo: string; nombre: string }).nombre}
                    </Link>
                  </p>
                )}
                {cfdi.oc && (
                  <p>
                    OC:{" "}
                    <Link
                      href={`/finanzas/oc/${(cfdi.oc as { id: string }).id}`}
                      className="text-primary hover:underline"
                    >
                      {(cfdi.oc as { numero: string }).numero}
                    </Link>
                  </p>
                )}
                {cfdi.ot && (
                  <p>
                    OT inter-co:{" "}
                    <Link
                      href={`/finanzas/ot/${(cfdi.ot as { id: string }).id}`}
                      className="text-primary hover:underline"
                    >
                      {(cfdi.ot as { numero: string }).numero}
                    </Link>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">
                Conceptos ({conceptos?.length ?? 0})
              </h2>
            </div>
            {(conceptos?.length ?? 0) === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Sin conceptos registrados.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/30 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">Descripción</th>
                    <th className="px-4 py-2 text-right font-medium">Cant</th>
                    <th className="px-4 py-2 text-right font-medium">P. unit</th>
                    <th className="px-4 py-2 text-right font-medium">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(conceptos ?? []).map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2 text-xs">{c.orden}</td>
                      <td className="px-4 py-2 text-xs">
                        <p>{c.descripcion}</p>
                        {c.clave_sat && (
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {c.clave_sat} · {c.unidad_sat ?? ""}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        {Number(c.cantidad).toLocaleString("es-MX")}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        {fmtMxn.format(Number(c.precio_unitario))}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {fmtMxn.format(Number(c.importe))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Acciones</h2>
            <div className="mt-3">
              <CfdiActions
                cfdiId={cfdi.id}
                estado={estado}
                saldoPendiente={saldo}
                puedeOperar={puedeOperar}
              />
            </div>
            {estado === "cancelado" && cfdi.motivo_cancelacion && (
              <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Cancelado · Motivo:{" "}
                {MOTIVOS_SAT[cfdi.motivo_cancelacion] ??
                  cfdi.motivo_cancelacion}
                {cfdi.uuid_sustituye && (
                  <>
                    <br />
                    Sustituido por: <code>{cfdi.uuid_sustituye}</code>
                  </>
                )}
              </p>
            )}
          </div>
        </section>

        <aside className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold">
              {fmtMxn.format(total)}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  {fmtMxn.format(Number(cfdi.subtotal ?? 0))}
                </span>
              </div>
              {Number(cfdi.descuento ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descuento</span>
                  <span className="font-mono">
                    −{fmtMxn.format(Number(cfdi.descuento))}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA traslado</span>
                <span className="font-mono">
                  {fmtMxn.format(Number(cfdi.iva_trasladado ?? 0))}
                </span>
              </div>
              {Number(cfdi.iva_retenido ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA retenido</span>
                  <span className="font-mono">
                    −{fmtMxn.format(Number(cfdi.iva_retenido))}
                  </span>
                </div>
              )}
              {Number(cfdi.isr_retenido ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ISR retenido</span>
                  <span className="font-mono">
                    −{fmtMxn.format(Number(cfdi.isr_retenido))}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-medium">
                <span>Total</span>
                <span className="font-mono">{fmtMxn.format(total)}</span>
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagado</span>
                <span className="font-mono">{fmtMxn.format(pagado)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Saldo</span>
                <span className="font-mono">{fmtMxn.format(saldo)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{
                    width: `${total > 0 ? Math.min((pagado / total) * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Archivos
            </p>
            <div className="mt-3 space-y-2">
              {xmlUrl ? (
                <a
                  href={xmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
                >
                  <FileText className="h-4 w-4" />
                  XML SAT
                  <Download className="ml-auto h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">Sin XML</p>
              )}
              {pdfUrl ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                  <Download className="ml-auto h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">Sin PDF</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 ${mono ? "font-mono text-xs" : "text-sm"}`}>
        {value}
      </p>
    </div>
  );
}
