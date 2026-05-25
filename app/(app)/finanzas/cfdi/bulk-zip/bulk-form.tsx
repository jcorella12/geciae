"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  Loader2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { importarZipCfdi } from "./actions";
import type { ImportarZipDetalle, ImportarZipState } from "./state";
import { initialImportarZipState } from "./state";

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

const MAX_BYTES = 100 * 1024 * 1024;

export function BulkZipForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ImportarZipState>(
    initialImportarZipState,
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    setResultado(initialImportarZipState);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".zip")) {
      setClientError("El archivo debe ser .zip");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      setClientError(
        `El archivo pesa ${(f.size / 1024 / 1024).toFixed(1)} MB. Máximo: ${MAX_BYTES / 1024 / 1024} MB.`,
      );
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(f);
  }

  function submit(formData: FormData) {
    if (!file) {
      setClientError("Selecciona un ZIP primero.");
      return;
    }
    formData.set("zip", file);
    setClientError(null);
    start(async () => {
      const r = await importarZipCfdi(initialImportarZipState, formData);
      setResultado(r);
      if (r.ok) {
        // No redirigir — el resumen es informativo y largo
        router.refresh();
      }
    });
  }

  const hayResultado = resultado.resumen !== null;

  return (
    <div className="space-y-6">
      <form
        action={submit}
        className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-sm"
      >
        <div>
          <Label htmlFor="zip" className="text-base font-semibold">
            Archivo ZIP del SAT
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            ZIP con pares <code>UUID.xml</code> y <code>UUID.pdf</code> (PDF
            opcional). Típicamente lo entrega el portal del SAT al descargar
            facturas emitidas o recibidas del mes.
          </p>

          <label
            htmlFor="zip"
            className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${
              file
                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950"
                : "border-border bg-secondary/30 hover:bg-secondary"
            }`}
          >
            <FileArchive
              className={`h-10 w-10 ${file ? "text-emerald-600" : "text-muted-foreground"}`}
            />
            {file ? (
              <>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · click para
                  cambiar
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">
                  Click para seleccionar un ZIP
                </p>
                <p className="text-xs text-muted-foreground">
                  Máximo {MAX_BYTES / 1024 / 1024} MB · hasta 1,000 CFDIs por
                  archivo
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              id="zip"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {clientError && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {clientError}
            </p>
          )}
        </div>

        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs dark:border-blue-800 dark:bg-blue-950">
          <p className="font-semibold">Cómo funciona:</p>
          <ul className="mt-1 ml-5 list-disc space-y-0.5 text-muted-foreground">
            <li>
              Se detecta la empresa del grupo automáticamente comparando RFC
              emisor/receptor del XML con los RFC registrados.
            </li>
            <li>
              Si el RFC del grupo aparece como emisor → se marca como{" "}
              <strong>emitido</strong> (venta).
            </li>
            <li>
              Si aparece como receptor → se marca como{" "}
              <strong>recibido</strong> (gasto).
            </li>
            <li>
              Proveedor / cliente se vincula automáticamente si su RFC ya está
              en el catálogo.
            </li>
            <li>
              UUIDs ya registrados se saltan (no se duplican).
            </li>
            <li>
              CFDIs cuyo RFC no pertenece a ninguna empresa del grupo se
              listan al final para revisión.
            </li>
          </ul>
        </div>

        <div className="flex gap-2 border-t border-border pt-4">
          <Button type="submit" disabled={!file || pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Procesar ZIP
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/finanzas/cfdi")}
            disabled={pending}
          >
            Cancelar
          </Button>
        </div>

        {resultado.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {resultado.error}
          </p>
        )}
      </form>

      {hayResultado && resultado.resumen && (
        <ResumenImportacion
          resumen={resultado.resumen}
          detalle={resultado.detalle}
        />
      )}
    </div>
  );
}

function ResumenImportacion({
  resumen,
  detalle,
}: {
  resumen: NonNullable<ImportarZipState["resumen"]>;
  detalle: ImportarZipDetalle[];
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold">Resumen</h2>
        <p className="text-xs text-muted-foreground">
          {resumen.total_xmls} XML(s) procesados de {resumen.total_archivos}{" "}
          archivos en el ZIP
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          label="Creados"
          value={resumen.creados}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          tone="success"
        />
        <StatCard label="Duplicados" value={resumen.duplicados} tone="warn" />
        <StatCard
          label="Sin empresa"
          value={resumen.sin_empresa}
          tone="muted"
        />
        <StatCard label="Saltados" value={resumen.saltados} tone="muted" />
        <StatCard label="Errores" value={resumen.errores} tone="error" />
      </div>

      <details open={resumen.errores > 0 || resumen.sin_empresa > 0}>
        <summary className="cursor-pointer text-sm font-medium">
          Detalle por archivo ({detalle.length})
        </summary>
        <div className="mt-3 max-h-96 overflow-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left">Estado</th>
                <th className="px-2 py-1.5 text-left">Empresa</th>
                <th className="px-2 py-1.5 text-left">Tipo</th>
                <th className="px-2 py-1.5 text-left">Dir.</th>
                <th className="px-2 py-1.5 text-left">RFC contraparte</th>
                <th className="px-2 py-1.5 text-right">Total</th>
                <th className="px-2 py-1.5 text-left">UUID / archivo</th>
                <th className="px-2 py-1.5 text-left">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {detalle.map((d, i) => (
                <tr
                  key={`${d.filename}-${i}`}
                  className="border-t border-border/60"
                >
                  <td className="px-2 py-1.5">
                    <EstadoBadge status={d.status} />
                  </td>
                  <td className="px-2 py-1.5">
                    {d.empresa_codigo ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            empresaCodigoColor[d.empresa_codigo] ??
                            "bg-muted-foreground"
                          }`}
                        />
                        {d.empresa_codigo}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">{d.tipo ?? "—"}</td>
                  <td className="px-2 py-1.5">
                    {d.es_emitido === true
                      ? "📤 Emit."
                      : d.es_emitido === false
                        ? "📥 Recib."
                        : "—"}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-[10px]">
                    {d.rfc_contraparte ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {d.total !== null ? fmtMxn.format(d.total) : "—"}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-[10px]">
                    {d.cfdi_id ? (
                      <Link
                        href={`/finanzas/cfdi/${d.cfdi_id}`}
                        className="text-primary hover:underline"
                      >
                        {d.uuid ?? d.filename}
                      </Link>
                    ) : (
                      d.uuid ?? d.filename.replace(/^.*[\\/]/, "")
                    )}
                    {d.con_pdf && (
                      <span className="ml-1 rounded bg-blue-100 px-1 text-[9px] text-blue-700">
                        +PDF
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {d.error ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="flex gap-2 border-t border-border pt-4">
        <Link href="/finanzas/cfdi">
          <Button variant="outline">Ver listado de CFDIs</Button>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  tone: "success" | "warn" | "error" | "muted";
}) {
  const colorMap: Record<string, string> = {
    success:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950",
    warn: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
    error: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
    muted: "border-border bg-secondary/30",
  };
  return (
    <div className={`rounded-md border p-3 ${colorMap[tone]}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}

function EstadoBadge({ status }: { status: ImportarZipDetalle["status"] }) {
  const map: Record<
    ImportarZipDetalle["status"],
    { label: string; cls: string }
  > = {
    creado: {
      label: "✓ Creado",
      cls: "bg-emerald-100 text-emerald-700",
    },
    duplicado: {
      label: "↺ Duplicado",
      cls: "bg-amber-100 text-amber-700",
    },
    sin_empresa: {
      label: "? Sin empresa",
      cls: "bg-gray-100 text-gray-700",
    },
    saltado: {
      label: "− Saltado",
      cls: "bg-gray-100 text-gray-700",
    },
    error: {
      label: "✗ Error",
      cls: "bg-red-100 text-red-700",
    },
  };
  const m = map[status];
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
