import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { obtenerVinculos, puedeGestionarProveedores } from "@/lib/auth/permisos";
import {
  CLASIFICACIONES_PROVEEDOR,
  SEMAFOROS,
  TIPOS_PROVEEDOR,
} from "@/lib/proveedores/schemas";
import { REGIMENES_FISCALES } from "@/lib/cfdi/catalogos-sat";
import { createClient } from "@/lib/supabase/server";

import { ToggleActivoProveedorButton } from "./toggle-activo";

export const dynamic = "force-dynamic";

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

function regimenLabel(c: string | null) {
  if (!c) return "—";
  const r = REGIMENES_FISCALES.find((x) => x.codigo === c);
  return r ? `${r.codigo} — ${r.nombre}` : c;
}
function tipoLabel(c: string | null) {
  if (!c) return "—";
  return TIPOS_PROVEEDOR.find((t) => t.value === c)?.label ?? c;
}
function clasificacionLabel(c: string | null) {
  if (!c) return "—";
  return CLASIFICACIONES_PROVEEDOR.find((x) => x.value === c)?.label ?? c;
}
function semaforoLabel(c: string | null) {
  return SEMAFOROS.find((s) => s.value === (c ?? "verde"))?.label ?? c ?? "—";
}

export default async function ProveedorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeGestionar = puedeGestionarProveedores(vinculos);

  const { data: prov } = await supabase
    .from("proveedores")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!prov) notFound();

  const { data: vinculosEmp } = await supabase
    .from("proveedores_empresas")
    .select("empresa_id, empresas(codigo, razon_social, nombre_comercial)")
    .eq("proveedor_id", params.id)
    .eq("activo", true);

  type Direccion = {
    calle?: string;
    numero_exterior?: string;
    numero_interior?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    pais?: string;
  };
  type Cuenta = { clabe?: string; banco?: string; titular?: string };
  const dir = (prov.direccion_fiscal as Direccion | null) ?? null;
  const cuenta = (prov.cuenta_bancaria as Cuenta | null) ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/finanzas/proveedores"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Proveedores
          </Link>
          <h1 className="mt-2 text-2xl font-semibold leading-tight">
            {prov.razon_social}
            {prov.activo === false && (
              <span className="ml-3 rounded-full bg-secondary px-2 py-0.5 align-middle text-xs">
                Inactivo
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {prov.nombre_comercial ?? "Sin nombre comercial"} ·{" "}
            <span className="font-mono">{prov.rfc}</span>
            {prov.tipo_proveedor && <> · {tipoLabel(prov.tipo_proveedor)}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              semaforoBadge[prov.semaforo ?? "verde"] ?? "bg-secondary"
            }`}
          >
            {semaforoLabel(prov.semaforo)}
          </span>
          {prov.esta_aprobado && (
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
              Aprobado
            </span>
          )}
          {prov.requiere_repse && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
              REPSE
            </span>
          )}
          {puedeGestionar && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/finanzas/proveedores/${prov.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Editar
                </Link>
              </Button>
              <ToggleActivoProveedorButton
                proveedorId={prov.id}
                activo={prov.activo ?? true}
              />
            </>
          )}
        </div>
      </div>

      <nav className="mb-6 flex gap-1 border-b border-border">
        <span className="border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary">
          General
        </span>
        <Link
          href={`/finanzas/proveedores/${prov.id}/documentacion`}
          className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Documentación
        </Link>
        <span className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground">
          Evaluaciones · Sprint 4B
        </span>
        <span className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground">
          Personal REPSE · Sprint 4B
        </span>
      </nav>

      <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Empresas que lo usan
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {!vinculosEmp || vinculosEmp.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin empresas vinculadas.</p>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Datos fiscales">
          <Row k="Razón social" v={prov.razon_social} />
          <Row k="Nombre comercial" v={prov.nombre_comercial ?? "—"} />
          <Row k="RFC" v={<code className="font-mono">{prov.rfc}</code>} />
          <Row k="CURP" v={prov.curp ? <code className="font-mono">{prov.curp}</code> : "—"} />
          <Row k="Régimen fiscal" v={regimenLabel(prov.regimen_fiscal)} />
          <Row k="CP fiscal" v={prov.cp_fiscal ?? "—"} />
          <Row k="Representante legal" v={prov.representante_legal ?? "—"} />
          <Row k="RFC representante" v={prov.rfc_representante ? <code className="font-mono">{prov.rfc_representante}</code> : "—"} />
        </Card>

        <Card title="Domicilio fiscal">
          {dir ? (
            <>
              <Row k="Calle" v={`${dir.calle ?? ""} ${dir.numero_exterior ?? ""}${dir.numero_interior ? ` Int. ${dir.numero_interior}` : ""}`.trim() || "—"} />
              <Row k="Colonia" v={dir.colonia ?? "—"} />
              <Row k="Municipio" v={dir.municipio ?? "—"} />
              <Row k="Estado" v={dir.estado ?? "—"} />
              <Row k="País" v={dir.pais ?? "México"} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin domicilio capturado.</p>
          )}
        </Card>

        <Card title="Clasificación comercial">
          <Row k="Tipo" v={tipoLabel(prov.tipo_proveedor)} />
          <Row k="Categoría SAT" v={prov.categoria_sat ?? "—"} />
          <Row k="Clasificación interna" v={clasificacionLabel(prov.clasificacion_interna)} />
          <Row k="Requiere REPSE" v={prov.requiere_repse ? "Sí" : "No"} />
        </Card>

        <Card title="Cuenta bancaria">
          {cuenta && (cuenta.clabe || cuenta.banco || cuenta.titular) ? (
            <>
              <Row k="CLABE" v={cuenta.clabe ? <code className="font-mono">{cuenta.clabe}</code> : "—"} />
              <Row k="Banco" v={cuenta.banco ?? "—"} />
              <Row k="Titular" v={cuenta.titular ?? "—"} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin cuenta capturada.</p>
          )}
        </Card>

        <Card title="Cumplimiento">
          <Row k="Semáforo" v={semaforoLabel(prov.semaforo)} />
          <Row k="Aprobado" v={prov.esta_aprobado ? "Sí" : "No"} />
          <Row k="Fecha aprobación" v={prov.fecha_aprobacion ? new Date(prov.fecha_aprobacion).toLocaleDateString("es-MX") : "—"} />
          <Row k="Evaluación promedio" v={prov.evaluacion_promedio != null ? prov.evaluacion_promedio.toFixed(2) : "—"} />
        </Card>

        {prov.observaciones && (
          <Card title="Observaciones">
            <p className="whitespace-pre-wrap text-sm">{prov.observaciones}</p>
          </Card>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {prov.created_at && <>Creado: {new Date(prov.created_at).toLocaleString("es-MX")}</>}
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
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
