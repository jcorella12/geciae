import Link from "next/link";
import { notFound } from "next/navigation";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { ESTADOS_OT } from "@/lib/ot/state";
import { createClient } from "@/lib/supabase/server";

import { OTActionButtons } from "./ot-actions-buttons";

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

export default async function OTDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();

  const { data: ot } = await supabase
    .from("ordenes_trabajo_inter_co")
    .select(
      "*, origen:empresas!ordenes_trabajo_inter_co_empresa_origen_id_fkey(codigo, razon_social, nombre_comercial), destino:empresas!ordenes_trabajo_inter_co_empresa_destino_id_fkey(codigo, razon_social, nombre_comercial), proyectos(id, codigo, nombre), catalogo_servicios(codigo, nombre)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!ot) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const callerId = user?.id ?? null;

  const empresasGestionables = vinculos
    .filter((v) =>
      ["ceo", "director", "operativo"].includes(v.rol),
    )
    .map((v) => v.empresa_id);

  const estado =
    ESTADOS_OT.find((s) => s.value === ot.estado) ?? ESTADOS_OT[0];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/finanzas/ot"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Órdenes de trabajo
          </Link>
          <h1 className="mt-2 font-mono text-2xl font-semibold leading-tight">
            {ot.numero}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  empresaCodigoColor[ot.origen?.codigo ?? ""] ??
                  "bg-muted-foreground"
                }`}
              />
              {ot.origen?.nombre_comercial ?? ot.origen?.razon_social}
            </span>
            <span className="mx-2 text-muted-foreground">paga →</span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  empresaCodigoColor[ot.destino?.codigo ?? ""] ??
                  "bg-muted-foreground"
                }`}
              />
              {ot.destino?.nombre_comercial ?? ot.destino?.razon_social}
            </span>
            <span className="ml-2">presta servicio</span>
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${estado.color}`}>
          {estado.label}
        </span>
      </div>

      <OTActionButtons
        ocId={ot.id}
        estado={ot.estado ?? "solicitada"}
        origenId={ot.empresa_origen_id}
        destinoId={ot.empresa_destino_id}
        capturadoPor={ot.capturado_por}
        aprobadoOrigenPor={ot.aprobado_origen_por}
        aprobadoDestinoPor={ot.aprobado_destino_por}
        empresasGestionables={empresasGestionables}
        callerId={callerId}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card title="Datos del trabajo">
          <Row k="Descripción" v={ot.descripcion} />
          {ot.catalogo_servicios && (
            <Row
              k="Servicio del catálogo"
              v={`${ot.catalogo_servicios.codigo} — ${ot.catalogo_servicios.nombre}`}
            />
          )}
          <Row k="Cantidad" v={`${ot.cantidad} ${ot.unidad ?? ""}`} />
          {ot.proyectos && (
            <Row
              k="Proyecto"
              v={
                <Link
                  href={`/proyectos/${ot.proyectos.id}`}
                  className="text-primary hover:underline"
                >
                  <code className="font-mono">{ot.proyectos.codigo}</code> ·{" "}
                  {ot.proyectos.nombre}
                </Link>
              }
            />
          )}
        </Card>

        <Card title="Fechas">
          <Row
            k="Solicitud"
            v={new Date(ot.fecha_solicitud).toLocaleDateString("es-MX")}
          />
          <Row
            k="Esperada"
            v={
              ot.fecha_completacion_esperada
                ? new Date(ot.fecha_completacion_esperada).toLocaleDateString("es-MX")
                : "—"
            }
          />
          <Row
            k="Real"
            v={
              ot.fecha_completacion_real
                ? new Date(ot.fecha_completacion_real).toLocaleDateString("es-MX")
                : "—"
            }
          />
        </Card>
      </div>

      {/* Totales */}
      <section className="mt-4 ml-auto max-w-sm rounded-lg border border-border bg-card p-5 shadow-sm">
        <dl className="space-y-1.5 text-sm">
          <Row
            k="Costo base"
            v={<span className="font-mono">{fmtMxn.format(Number(ot.costo_base))}</span>}
          />
          <Row
            k={`Margen ${(Number(ot.margen_aplicado) * 100).toFixed(0)}%`}
            v={
              <span className="font-mono">
                +{fmtMxn.format(Number(ot.precio_inter_co) - Number(ot.costo_base))}
              </span>
            }
          />
          <Row
            k="Precio inter-co"
            v={<span className="font-mono">{fmtMxn.format(Number(ot.precio_inter_co))}</span>}
          />
          <Row
            k="IVA"
            v={<span className="font-mono">{fmtMxn.format(Number(ot.iva ?? 0))}</span>}
          />
          <Row
            k="Retenciones"
            v={<span className="font-mono">- {fmtMxn.format(Number(ot.retenciones))}</span>}
          />
          <div className="my-2 border-t border-border" />
          <Row
            k={<strong>Total</strong>}
            v={
              <strong className="font-mono text-base">
                {fmtMxn.format(Number(ot.total))}
              </strong>
            }
          />
        </dl>
      </section>

      {ot.observaciones && (
        <Card title="Observaciones" className="mt-4">
          <p className="whitespace-pre-wrap text-sm">{ot.observaciones}</p>
        </Card>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        {ot.created_at && <>Creada {new Date(ot.created_at).toLocaleString("es-MX")}</>}
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
