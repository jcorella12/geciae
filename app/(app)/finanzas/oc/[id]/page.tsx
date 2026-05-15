import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  obtenerVinculos,
  puedeAprobarOC,
} from "@/lib/auth/permisos";
import { ESTADOS_OC } from "@/lib/oc/state";
import { createClient } from "@/lib/supabase/server";

import { OCActionButtons } from "./oc-actions-buttons";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const semaforoBadge: Record<string, string> = {
  verde: "bg-success/15 text-success",
  amarillo: "bg-warning/15 text-foreground",
  rojo: "bg-destructive/15 text-destructive",
  negro: "bg-foreground/10 text-foreground",
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export default async function OCDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();

  const { data: oc } = await supabase
    .from("ordenes_compra")
    .select(
      "*, empresas(codigo, razon_social, nombre_comercial), proveedores(id, razon_social, rfc, semaforo), proyectos(id, codigo, nombre, estado)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!oc) notFound();

  const { data: conceptos } = await supabase
    .from("ordenes_compra_conceptos")
    .select("*")
    .eq("oc_id", params.id)
    .order("orden");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const puedeAprobar = puedeAprobarOC(
    vinculos,
    oc.empresa_id,
    Number(oc.total),
  );
  const esCapturador = user?.id === oc.capturado_por;

  const estado = ESTADOS_OC.find((s) => s.value === oc.estado) ?? ESTADOS_OC[0];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/finanzas/oc"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Órdenes de compra
          </Link>
          <h1 className="mt-2 font-mono text-2xl font-semibold leading-tight">
            {oc.numero}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  empresaCodigoColor[oc.empresas?.codigo ?? ""] ??
                  "bg-muted-foreground"
                }`}
              />
              {oc.empresas?.nombre_comercial ?? oc.empresas?.razon_social}
            </span>
            {" · "}Emitida{" "}
            {new Date(oc.fecha_emision).toLocaleDateString("es-MX")}
          </p>
        </div>

        <span className={`rounded-full px-3 py-1 text-sm font-medium ${estado.color}`}>
          {estado.label}
        </span>
      </div>

      {/* Patch 4 — alerta cuando el movimiento de centro falló.
         Cast hasta regenerar types con supabase gen types --linked. */}
      {(() => {
        const ocExt = oc as typeof oc & {
          centro_movimiento_registrado_at: string | null;
          centro_movimiento_error: string | null;
        };
        return (
          oc.centro_id &&
          !ocExt.centro_movimiento_registrado_at &&
          ["aprobada", "recibida", "pagada"].includes(
            (oc.estado ?? "") as string,
          ) && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Movimiento de centro pendiente:</strong> esta OC
                  aprobada todavía no registra su gasto en el centro de
                  costo.
                  {ocExt.centro_movimiento_error && (
                    <>
                      {" "}Último error:{" "}
                      <code className="rounded bg-amber-100 px-1 text-xs">
                        {ocExt.centro_movimiento_error}
                      </code>
                      .
                    </>
                  )}{" "}
                  El P&amp;L del centro está incompleto hasta reintentar
                  (CEO o contralor puede correr el reintento masivo desde
                  el panel admin).
                </div>
              </div>
            </div>
          )
        );
      })()}

      <OCActionButtons
        ocId={oc.id}
        estado={oc.estado ?? "borrador"}
        puedeAprobar={puedeAprobar}
        esCapturador={esCapturador}
      />

      <nav className="mt-6 mb-6 flex gap-1 border-b border-border">
        <span className="border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary">
          General
        </span>
        <Link
          href={`/finanzas/oc/${oc.id}/recepcion`}
          className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Recepción
        </Link>
        <span className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground">
          CFDI vinculado · Sprint 6
        </span>
        <span className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground">
          Auditoría · Sprint 9
        </span>
      </nav>

      {/* Proveedor + datos generales */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Proveedor">
          <Row k="Razón social" v={oc.proveedores?.razon_social ?? "—"} />
          <Row
            k="RFC"
            v={
              oc.proveedores?.rfc ? (
                <code className="font-mono">{oc.proveedores.rfc}</code>
              ) : (
                "—"
              )
            }
          />
          <Row
            k="Semáforo"
            v={
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  semaforoBadge[oc.proveedores?.semaforo ?? "verde"] ??
                  "bg-secondary"
                }`}
              >
                {oc.proveedores?.semaforo ?? "verde"}
              </span>
            }
          />
        </Card>

        <Card title="Datos generales">
          <Row
            k="Fecha emisión"
            v={new Date(oc.fecha_emision).toLocaleDateString("es-MX")}
          />
          <Row
            k="Entrega esperada"
            v={
              oc.fecha_entrega_esperada
                ? new Date(oc.fecha_entrega_esperada).toLocaleDateString("es-MX")
                : "—"
            }
          />
          <Row k="Condiciones pago" v={oc.condiciones_pago ?? "—"} />
          <Row k="Forma pago" v={oc.forma_pago ?? "—"} />
          <Row
            k="Proyecto"
            v={
              oc.proyectos ? (
                <Link
                  href={`/proyectos/${oc.proyectos.id}`}
                  className="hover:text-primary hover:underline"
                >
                  <code className="font-mono">{oc.proyectos.codigo}</code> —{" "}
                  {oc.proyectos.nombre}
                </Link>
              ) : (
                <span className="text-muted-foreground">Sin proyecto</span>
              )
            }
          />
        </Card>
      </div>

      {/* Conceptos */}
      <section className="mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Conceptos ({conceptos?.length ?? 0})
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/30 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Descripción</th>
              <th className="px-4 py-2 text-right font-medium">Cant.</th>
              <th className="px-4 py-2 font-medium">Unidad</th>
              <th className="px-4 py-2 text-right font-medium">P. Unit.</th>
              <th className="px-4 py-2 text-right font-medium">IVA</th>
              <th className="px-4 py-2 text-right font-medium">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(conceptos ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 text-muted-foreground">{c.orden}</td>
                <td className="px-4 py-2">{c.descripcion}</td>
                <td className="px-4 py-2 text-right font-mono">{c.cantidad}</td>
                <td className="px-4 py-2 text-xs">{c.unidad_sat ?? "—"}</td>
                <td className="px-4 py-2 text-right font-mono">
                  {fmtMxn.format(Number(c.precio_unitario))}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {Math.round(Number(c.iva_tasa) * 100)}%
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  {fmtMxn.format(Number(c.importe))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totales */}
      <section className="mt-4 ml-auto max-w-sm rounded-lg border border-border bg-card p-5 shadow-sm">
        <dl className="space-y-1.5 text-sm">
          <Row k="Subtotal" v={<span className="font-mono">{fmtMxn.format(Number(oc.subtotal))}</span>} />
          <Row k="Descuento" v={<span className="font-mono">- {fmtMxn.format(Number(oc.descuento))}</span>} />
          <Row k="IVA" v={<span className="font-mono">{fmtMxn.format(Number(oc.iva ?? 0))}</span>} />
          <Row k="Retenciones" v={<span className="font-mono">- {fmtMxn.format(Number(oc.retenciones))}</span>} />
          <div className="my-2 border-t border-border" />
          <Row
            k={<strong>Total</strong>}
            v={
              <strong className="font-mono text-base">
                {fmtMxn.format(Number(oc.total))}
              </strong>
            }
          />
        </dl>
      </section>

      {oc.comentarios && (
        <Card title="Comentarios" className="mt-4">
          <p className="whitespace-pre-wrap text-sm">{oc.comentarios}</p>
        </Card>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        {oc.created_at && (
          <>Capturada {new Date(oc.created_at).toLocaleString("es-MX")}</>
        )}
        {oc.fecha_aprobacion && (
          <>
            {" · "}Aprobada{" "}
            {new Date(oc.fecha_aprobacion).toLocaleString("es-MX")}
          </>
        )}
      </p>
    </div>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-border bg-card p-5 shadow-sm ${className ?? ""}`}
    >
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <dl className="space-y-2 text-sm">{children}</dl>
    </section>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
