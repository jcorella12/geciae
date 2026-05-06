import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BotonFavorito } from "@/components/ui/boton-favorito";
import { Button } from "@/components/ui/button";
import { obtenerVinculos, puedeGestionarClientes } from "@/lib/auth/permisos";
import { REGIMENES_FISCALES, USOS_CFDI } from "@/lib/sat/catalogos";
import { createClient } from "@/lib/supabase/server";

import { ToggleActivoButton } from "./toggle-activo";

export const dynamic = "force-dynamic";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const riesgoBadge: Record<string, string> = {
  bajo: "bg-success/15 text-success",
  medio: "bg-warning/15 text-foreground",
  alto: "bg-destructive/15 text-destructive",
};

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

export default async function ClienteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeGestionar = puedeGestionarClientes(vinculos);

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select(
      "id, razon_social, nombre_comercial, rfc, curp, regimen_fiscal, cp_fiscal, direccion_fiscal, email_facturacion, uso_cfdi_default, tipo, segmento, riesgo, observaciones, activo, score_pago, score_satisfaccion, created_at, updated_at",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !cliente) notFound();

  // Empresas vinculadas.
  const { data: vinculosEmp } = await supabase
    .from("clientes_empresas")
    .select("empresa_id, empresas(codigo, razon_social, nombre_comercial)")
    .eq("cliente_id", params.id)
    .eq("activo", true);

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
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/clientes"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Clientes
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold leading-tight">
            <BotonFavorito
              entidadTipo="cliente"
              entidadId={cliente.id}
              esFavoritoInicial={false}
              etiqueta={cliente.razon_social}
            />
            {cliente.razon_social}
            {!cliente.activo && (
              <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 align-middle text-xs">
                Inactivo
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cliente.nombre_comercial ?? "Sin nombre comercial"} ·{" "}
            <span className="font-mono">{cliente.rfc}</span>
            {cliente.tipo && <> · {cliente.tipo}</>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs capitalize ${
              riesgoBadge[cliente.riesgo ?? "bajo"] ?? "bg-secondary"
            }`}
          >
            Riesgo {cliente.riesgo ?? "bajo"}
          </span>
          {puedeGestionar && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/clientes/${cliente.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Editar
                </Link>
              </Button>
              <ToggleActivoButton
                clienteId={cliente.id}
                activo={cliente.activo ?? true}
              />
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <nav className="mb-6 flex gap-1 border-b border-border">
        <span className="border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary">
          General
        </span>
        <span className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground">
          Contactos · Sprint 2C
        </span>
        <span className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground">
          Documentos · Sprint 3
        </span>
        <span className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground">
          CFDI · Sprint 6
        </span>
      </nav>

      {/* Empresas que lo atienden */}
      <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Empresas que lo atienden
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {!vinculosEmp || vinculosEmp.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin empresas vinculadas.
            </p>
          ) : (
            vinculosEmp.map((v, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm"
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    empresaCodigoColor[v.empresas?.codigo ?? ""] ??
                    "bg-muted-foreground"
                  }`}
                />
                {v.empresas?.nombre_comercial ?? v.empresas?.razon_social}
              </span>
            ))
          )}
        </div>
      </section>

      {/* General */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Datos fiscales">
          <Row k="Razón social" v={cliente.razon_social} />
          <Row k="Nombre comercial" v={cliente.nombre_comercial ?? "—"} />
          <Row k="RFC" v={<code className="font-mono">{cliente.rfc}</code>} />
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

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
