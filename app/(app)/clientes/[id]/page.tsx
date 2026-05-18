import { notFound } from "next/navigation";

import { REGIMENES_FISCALES, USOS_CFDI } from "@/lib/sat/catalogos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function regimenLabel(codigo: string | null) {
  if (!codigo) return "—";
  const r = REGIMENES_FISCALES.find((x) => x.codigo === codigo);
  return r ? `${r.codigo} — ${r.nombre}` : codigo;
}
function usoCfdiLabel(codigo: string | null) {
  if (!codigo) return "—";
  const u = USOS_CFDI.find((x) => x.codigo === codigo);
  return u ? `${u.codigo} — ${u.nombre}` : codigo;
}

/**
 * Tab "General" del detalle de cliente.
 * El header y los tabs viven en `layout.tsx`.
 */
export default async function ClienteGeneralPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: cliente, error } = await supabase
    .from("clientes")
    .select(
      "id, razon_social, nombre_comercial, rfc, curp, regimen_fiscal, cp_fiscal, direccion_fiscal, email_facturacion, uso_cfdi_default, tipo, segmento, riesgo, observaciones, activo, score_pago, score_satisfaccion, created_at, updated_at",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !cliente) notFound();

  type DireccionFiscal = {
    calle?: string;
    numero_exterior?: string;
    numero_interior?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    pais?: string;
  };
  const dir = (cliente.direccion_fiscal as DireccionFiscal | null) ?? null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Datos fiscales">
          <Row k="Razón social" v={cliente.razon_social} />
          <Row k="Nombre comercial" v={cliente.nombre_comercial ?? "—"} />
          <Row k="RFC" v={<code className="font-mono">{cliente.rfc ?? "—"}</code>} />
          <Row k="CURP" v={cliente.curp ? <code className="font-mono">{cliente.curp}</code> : "—"} />
          <Row k="Régimen fiscal" v={regimenLabel(cliente.regimen_fiscal)} />
          <Row k="CP fiscal" v={cliente.cp_fiscal ?? "—"} />
        </Card>

        <Card title="Domicilio fiscal">
          {dir ? (
            <>
              <Row
                k="Calle"
                v={`${dir.calle ?? ""} ${dir.numero_exterior ?? ""}${
                  dir.numero_interior ? ` Int. ${dir.numero_interior}` : ""
                }`.trim() || "—"}
              />
              <Row k="Colonia" v={dir.colonia ?? "—"} />
              <Row k="Municipio" v={dir.municipio ?? "—"} />
              <Row k="Estado" v={dir.estado ?? "—"} />
              <Row k="País" v={dir.pais ?? "México"} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin domicilio capturado.</p>
          )}
        </Card>

        <Card title="Facturación">
          <Row k="Correo de facturación" v={cliente.email_facturacion ?? "—"} />
          <Row k="Uso CFDI default" v={usoCfdiLabel(cliente.uso_cfdi_default)} />
        </Card>

        <Card title="Comercial">
          <Row k="Tipo" v={cliente.tipo ?? "—"} />
          <Row k="Segmento" v={cliente.segmento ?? "—"} />
          <Row
            k="Score de pago"
            v={
              cliente.score_pago != null
                ? cliente.score_pago.toFixed(2)
                : "—"
            }
          />
          <Row
            k="Score de satisfacción"
            v={
              cliente.score_satisfaccion != null
                ? cliente.score_satisfaccion.toFixed(2)
                : "—"
            }
          />
        </Card>
      </div>

      {cliente.observaciones && (
        <Card title="Observaciones" className="mt-4">
          <p className="whitespace-pre-wrap text-sm">{cliente.observaciones}</p>
        </Card>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        {cliente.created_at && (
          <>Creado: {new Date(cliente.created_at).toLocaleString("es-MX")}</>
        )}
        {cliente.updated_at &&
          cliente.updated_at !== cliente.created_at && (
            <>
              {" · "}Actualizado:{" "}
              {new Date(cliente.updated_at).toLocaleString("es-MX")}
            </>
          )}
      </p>
    </>
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

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
