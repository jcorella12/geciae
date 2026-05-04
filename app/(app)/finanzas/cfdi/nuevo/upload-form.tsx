"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseCfdiXml, type CfdiParsed } from "@/lib/cfdi/parser";

import { subirCfdi } from "../actions";

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

type Empresa = {
  id: string;
  codigo: string;
  rfc: string;
  razon_social: string;
  nombre_comercial: string | null;
};

type ProveedorOpcion = { id: string; rfc: string; razon_social: string };
type ClienteOpcion = { id: string; rfc: string | null; razon_social: string };
type OcOpcion = {
  id: string;
  numero: string;
  empresa_id: string;
  total: number;
  proveedor_id: string;
};
type OtOpcion = {
  id: string;
  numero: string;
  empresa_origen_id: string;
  empresa_destino_id: string;
  total: number;
};

export function UploadCfdiForm({
  empresas,
  proveedores,
  clientes,
  ocs,
  ots,
}: {
  empresas: Empresa[];
  proveedores: ProveedorOpcion[];
  clientes: ClienteOpcion[];
  ocs: OcOpcion[];
  ots: OtOpcion[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [parsed, setParsed] = useState<CfdiParsed | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [empresaId, setEmpresaId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-detectar empresa por RFC del XML
  useEffect(() => {
    if (!parsed) return;
    if (empresaId) return;
    const matchEmisor = empresas.find(
      (e) => e.rfc.toUpperCase() === parsed.rfc_emisor.toUpperCase(),
    );
    if (matchEmisor) {
      setEmpresaId(matchEmisor.id);
      return;
    }
    const matchReceptor = empresas.find(
      (e) => e.rfc.toUpperCase() === parsed.rfc_receptor.toUpperCase(),
    );
    if (matchReceptor) setEmpresaId(matchReceptor.id);
  }, [parsed, empresas, empresaId]);

  // Inferir es_emitido: si el RFC emisor coincide con la empresa seleccionada → emitido
  const empresa = empresas.find((e) => e.id === empresaId);
  const esEmitido =
    empresa && parsed
      ? empresa.rfc.toUpperCase() === parsed.rfc_emisor.toUpperCase()
      : null;

  // Filtrar proveedor/cliente por RFC contraparte
  const rfcContraparte = parsed
    ? esEmitido
      ? parsed.rfc_receptor
      : parsed.rfc_emisor
    : null;
  const proveedorMatch = proveedores.find(
    (p) => p.rfc.toUpperCase() === (rfcContraparte ?? "").toUpperCase(),
  );
  const clienteMatch = clientes.find(
    (c) =>
      (c.rfc ?? "").toUpperCase() === (rfcContraparte ?? "").toUpperCase(),
  );

  // OC/OT sugeridos por empresa + monto similar
  const ocsSugeridas = parsed && empresaId
    ? ocs.filter(
        (o) =>
          o.empresa_id === empresaId &&
          (proveedorMatch ? o.proveedor_id === proveedorMatch.id : true) &&
          Math.abs(Number(o.total) - parsed.total) < parsed.total * 0.05,
      )
    : [];
  const otsSugeridas = parsed && empresaId
    ? ots.filter(
        (o) =>
          (o.empresa_origen_id === empresaId ||
            o.empresa_destino_id === empresaId) &&
          Math.abs(Number(o.total) - parsed.total) < parsed.total * 0.05,
      )
    : [];

  async function handleXmlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setParseError(null);
    setParsed(null);
    setXmlFile(null);
    if (!f) return;
    try {
      const text = await f.text();
      const p = parseCfdiXml(text);
      setParsed(p);
      setXmlFile(f);
    } catch (err) {
      setParseError(`No se pudo leer el XML: ${(err as Error).message}`);
    }
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPdfFile(e.target.files?.[0] ?? null);
  }

  function submit(formData: FormData) {
    if (!xmlFile) {
      setError("Falta XML.");
      return;
    }
    formData.set("xml", xmlFile);
    if (pdfFile) formData.set("pdf", pdfFile);
    setError(null);
    start(async () => {
      const r = await subirCfdi(
        { ok: false, cfdiId: null, error: null },
        formData,
      );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (r.cfdiId) router.push(`/finanzas/cfdi/${r.cfdiId}`);
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-6 rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      {/* Paso 1: subir XML */}
      <div>
        <Label htmlFor="xml" className="text-base font-semibold">
          1 · Archivo XML del SAT
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Sube el XML de la factura ya timbrada. El sistema lee todos los
          datos automáticamente.
        </p>
        <div className="mt-2">
          <input
            id="xml"
            type="file"
            accept=".xml,application/xml,text/xml"
            onChange={handleXmlChange}
            className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            required
          />
        </div>
        {parseError && (
          <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {parseError}
          </p>
        )}
      </div>

      {/* Paso 2: preview de los datos */}
      {parsed && (
        <>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vista previa del CFDI
            </p>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Field label="UUID" value={parsed.uuid_sat ?? "—"} mono />
              <Field
                label="Tipo"
                value={`${parsed.tipo_comprobante} · ${parsed.serie ?? ""}${parsed.folio ?? ""}`}
              />
              <Field
                label="Fecha"
                value={new Date(parsed.fecha_emision).toLocaleString("es-MX")}
              />
              <Field
                label="Total"
                value={fmtMxn.format(parsed.total)}
                mono
                bold
              />
              <Field
                label="Emisor"
                value={`${parsed.rfc_emisor} · ${parsed.nombre_emisor ?? "—"}`}
                mono
              />
              <Field
                label="Receptor"
                value={`${parsed.rfc_receptor} · ${parsed.nombre_receptor ?? "—"}`}
                mono
              />
              <Field
                label="Subtotal"
                value={fmtMxn.format(parsed.subtotal)}
                mono
              />
              <Field
                label="IVA trasladado"
                value={fmtMxn.format(parsed.iva_trasladado)}
                mono
              />
              {parsed.iva_retenido > 0 && (
                <Field
                  label="IVA retenido"
                  value={fmtMxn.format(parsed.iva_retenido)}
                  mono
                />
              )}
              {parsed.isr_retenido > 0 && (
                <Field
                  label="ISR retenido"
                  value={fmtMxn.format(parsed.isr_retenido)}
                  mono
                />
              )}
              <Field label="Método pago" value={parsed.metodo_pago ?? "—"} />
              <Field label="Forma pago" value={parsed.forma_pago ?? "—"} />
              <Field label="Uso CFDI" value={parsed.uso_cfdi ?? "—"} />
            </div>
            {parsed.conceptos.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Conceptos ({parsed.conceptos.length})
                </p>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {parsed.conceptos.slice(0, 3).map((c) => (
                    <li key={c.orden}>
                      <span className="text-muted-foreground">
                        {c.cantidad} {c.unidad_sat ?? ""} ×
                      </span>{" "}
                      {c.descripcion} —{" "}
                      <span className="font-mono">
                        {fmtMxn.format(c.importe)}
                      </span>
                    </li>
                  ))}
                  {parsed.conceptos.length > 3 && (
                    <li className="text-muted-foreground">
                      … y {parsed.conceptos.length - 3} más
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Paso 3: empresa */}
          <div>
            <Label className="text-base font-semibold">
              2 · Empresa del grupo
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              ¿A qué empresa pertenece esta factura?
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {empresas.map((e) => {
                const esEm = e.rfc.toUpperCase() === parsed.rfc_emisor.toUpperCase();
                const esRec = e.rfc.toUpperCase() === parsed.rfc_receptor.toUpperCase();
                const sugerida = esEm || esRec;
                return (
                  <label
                    key={e.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      empresaId === e.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="empresa_id"
                      value={e.id}
                      checked={empresaId === e.id}
                      onChange={() => setEmpresaId(e.id)}
                      required
                      className="h-4 w-4"
                    />
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
                      }`}
                    />
                    <span className="flex-1 truncate">
                      {e.nombre_comercial ?? e.razon_social}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {e.rfc}
                    </span>
                    {sugerida && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        {esEm ? "emisor" : "receptor"}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {empresaId && esEmitido !== null && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950">
              <p>
                <strong>
                  {esEmitido
                    ? "📤 Este CFDI lo emitió esta empresa"
                    : "📥 Este CFDI fue recibido (gasto)"}
                </strong>
              </p>
              <input
                type="hidden"
                name="es_emitido"
                value={String(esEmitido)}
              />
            </div>
          )}

          {/* Paso 4: vinculaciones */}
          {empresaId && (
            <div>
              <Label className="text-base font-semibold">
                3 · Vincular (opcional)
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Liga la factura a la OC/OT/proyecto que originó el gasto o
                ingreso. Si no la encuentras, déjalo vacío.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {!esEmitido && (
                  <div className="space-y-1">
                    <Label htmlFor="proveedor_id" className="text-xs">
                      Proveedor
                    </Label>
                    <select
                      id="proveedor_id"
                      name="proveedor_id"
                      defaultValue={proveedorMatch?.id ?? ""}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— Sin vincular —</option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.razon_social} ({p.rfc})
                        </option>
                      ))}
                    </select>
                    {proveedorMatch && (
                      <p className="text-[10px] text-emerald-700">
                        ✓ Auto-detectado por RFC
                      </p>
                    )}
                  </div>
                )}
                {esEmitido && (
                  <div className="space-y-1">
                    <Label htmlFor="cliente_id" className="text-xs">
                      Cliente
                    </Label>
                    <select
                      id="cliente_id"
                      name="cliente_id"
                      defaultValue={clienteMatch?.id ?? ""}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— Sin vincular —</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.razon_social} {c.rfc ? `(${c.rfc})` : ""}
                        </option>
                      ))}
                    </select>
                    {clienteMatch && (
                      <p className="text-[10px] text-emerald-700">
                        ✓ Auto-detectado por RFC
                      </p>
                    )}
                  </div>
                )}
                {!esEmitido && ocsSugeridas.length > 0 && (
                  <div className="space-y-1">
                    <Label htmlFor="oc_id" className="text-xs">
                      Orden de compra
                    </Label>
                    <select
                      id="oc_id"
                      name="oc_id"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— Sin vincular —</option>
                      {ocsSugeridas.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.numero} · {fmtMxn.format(Number(o.total))}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      {ocsSugeridas.length} OC con monto cercano
                    </p>
                  </div>
                )}
                {otsSugeridas.length > 0 && (
                  <div className="space-y-1">
                    <Label htmlFor="ot_id" className="text-xs">
                      OT inter-co
                    </Label>
                    <select
                      id="ot_id"
                      name="ot_id"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— Sin vincular —</option>
                      {otsSugeridas.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.numero} · {fmtMxn.format(Number(o.total))}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paso 5: PDF opcional */}
          <div>
            <Label htmlFor="pdf" className="text-base font-semibold">
              4 · PDF (opcional)
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Sube también la representación impresa para tenerla a mano.
            </p>
            <input
              id="pdf"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handlePdfChange}
              className="mt-2 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-secondary/80"
            />
          </div>
        </>
      )}

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={!parsed || !empresaId || pending}>
          <Upload className="h-4 w-4" />
          {pending ? "Guardando…" : "Registrar CFDI"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/finanzas/cfdi")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  mono,
  bold,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 ${mono ? "font-mono text-xs" : "text-sm"} ${bold ? "font-semibold" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
