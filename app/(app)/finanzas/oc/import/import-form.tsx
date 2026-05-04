"use client";

import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
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

import { type ImportResult, type ImportRow, importarOCsBatch } from "./actions";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

type Parsed = {
  rows: ImportRow[];
  errores: Array<{ row: number; motivo: string }>;
};

function parseCSV(text: string): string[][] {
  // Parser CSV simple. Asume comas y comillas dobles para escapar.
  const lines: string[][] = [];
  const rows = text.split(/\r?\n/).filter((l) => l.trim());
  for (const line of rows) {
    const fields: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuote = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ",") {
          fields.push(current);
          current = "";
        } else if (ch === "\t") {
          fields.push(current);
          current = "";
        } else current += ch;
      }
    }
    fields.push(current);
    lines.push(fields.map((f) => f.trim()));
  }
  return lines;
}

function parseRows(text: string): Parsed {
  const lines = parseCSV(text);
  if (lines.length < 2) {
    return { rows: [], errores: [{ row: 1, motivo: "Archivo vacío o solo header" }] };
  }
  const header = lines[0].map((h) => h.toLowerCase().trim());
  // Headers esperados: numero, empresa, rfc_proveedor, fecha, total, estado, [proyecto], [comentarios]
  const idx = (name: string, alt?: string[]) => {
    const candidates = [name, ...(alt ?? [])];
    for (const c of candidates) {
      const i = header.indexOf(c.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };

  const iNumero = idx("numero", ["número", "no_oc", "no oc"]);
  const iEmpresa = idx("empresa", ["empresa_codigo", "empresa codigo"]);
  const iRfc = idx("rfc", ["rfc_proveedor", "rfc proveedor"]);
  const iFecha = idx("fecha", ["fecha_emision", "fecha emision"]);
  const iTotal = idx("total");
  const iSubtotal = idx("subtotal");
  const iIva = idx("iva");
  const iEstado = idx("estado");
  const iProyecto = idx("proyecto", ["proyecto_codigo", "proyecto codigo"]);
  const iEntrega = idx("entrega", ["fecha_entrega", "entrega_esperada"]);
  const iComentarios = idx("comentarios", ["comentario", "notas"]);

  const obligatorios = [
    ["numero", iNumero],
    ["empresa", iEmpresa],
    ["rfc", iRfc],
    ["fecha", iFecha],
    ["total", iTotal],
  ] as const;
  for (const [name, i] of obligatorios) {
    if (i < 0) {
      return {
        rows: [],
        errores: [
          {
            row: 1,
            motivo: `Falta columna obligatoria: ${name}`,
          },
        ],
      };
    }
  }

  const rows: ImportRow[] = [];
  const errores: Array<{ row: number; motivo: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.every((c) => !c)) continue;
    const numero = line[iNumero] ?? "";
    if (!numero) {
      errores.push({ row: i + 1, motivo: "Sin número" });
      continue;
    }
    const total = parseFloat((line[iTotal] ?? "").replace(/[$,\s]/g, ""));
    if (Number.isNaN(total)) {
      errores.push({ row: i + 1, motivo: "Total inválido" });
      continue;
    }
    let fecha = (line[iFecha] ?? "").trim();
    // Soportar DD/MM/YYYY → YYYY-MM-DD
    const m = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) fecha = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;

    let entrega = iEntrega >= 0 ? (line[iEntrega] ?? "").trim() : "";
    if (entrega) {
      const m2 = entrega.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m2) entrega = `${m2[3]}-${m2[2].padStart(2, "0")}-${m2[1].padStart(2, "0")}`;
    }

    rows.push({
      numero,
      empresa_codigo: line[iEmpresa] ?? "",
      rfc_proveedor: (line[iRfc] ?? "").toUpperCase(),
      fecha_emision: fecha,
      fecha_entrega_esperada: entrega || undefined,
      total,
      subtotal:
        iSubtotal >= 0
          ? parseFloat((line[iSubtotal] ?? "").replace(/[$,\s]/g, ""))
          : undefined,
      iva:
        iIva >= 0
          ? parseFloat((line[iIva] ?? "").replace(/[$,\s]/g, ""))
          : undefined,
      estado: line[iEstado] ?? "borrador",
      proyecto_codigo:
        iProyecto >= 0 ? (line[iProyecto] ?? "").trim() || undefined : undefined,
      comentarios:
        iComentarios >= 0
          ? (line[iComentarios] ?? "").trim() || undefined
          : undefined,
    });
  }

  return { rows, errores };
}

export function ImportOCForm() {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    const text = await f.text();
    setParsed(parseRows(text));
    setResult(null);
  }

  async function importar() {
    if (!parsed || parsed.rows.length === 0) return;
    start(async () => {
      const r = await importarOCsBatch(parsed.rows);
      setResult(r);
    });
  }

  return (
    <div className="space-y-5">
      {/* Plantilla */}
      <section className="rounded-md border border-border bg-card p-5 shadow-xs">
        <h2 className="mb-2 text-[14px] font-semibold">Formato esperado</h2>
        <p className="mb-3 text-[12.5px] text-ink-3">
          Archivo CSV o TSV con header en la primera línea. Columnas obligatorias:
          <code className="mx-1 rounded bg-bg-2 px-1 py-px text-[11px]">numero</code>
          ,
          <code className="mx-1 rounded bg-bg-2 px-1 py-px text-[11px]">empresa</code>
          ,
          <code className="mx-1 rounded bg-bg-2 px-1 py-px text-[11px]">rfc</code>
          ,
          <code className="mx-1 rounded bg-bg-2 px-1 py-px text-[11px]">fecha</code>
          ,
          <code className="mx-1 rounded bg-bg-2 px-1 py-px text-[11px]">total</code>
          .
        </p>
        <p className="mb-3 text-[12px] text-ink-3">
          Opcionales:{" "}
          <code className="rounded bg-bg-2 px-1 py-px text-[11px]">subtotal</code>{" "}
          <code className="rounded bg-bg-2 px-1 py-px text-[11px]">iva</code>{" "}
          <code className="rounded bg-bg-2 px-1 py-px text-[11px]">estado</code>{" "}
          <code className="rounded bg-bg-2 px-1 py-px text-[11px]">proyecto</code>{" "}
          <code className="rounded bg-bg-2 px-1 py-px text-[11px]">comentarios</code>{" "}
          <code className="rounded bg-bg-2 px-1 py-px text-[11px]">entrega</code>
        </p>
        <pre className="overflow-x-auto rounded-md border border-border bg-bg-2 p-3 text-[10.5px] font-mono">
          {`numero,empresa,rfc,fecha,total,estado,proyecto,comentarios
OC-2026-0001,CIAE,CME880201XY3,2026-04-15,150000.00,aprobada,PRY-2024-031,Anticipo cemento
OC-2026-0002,PSE,FVN150607BR2,2026-04-18,28500.50,recibida,,Tornillería`}
        </pre>
        <div className="mt-3 flex items-center gap-3">
          <a
            href="data:text/csv;charset=utf-8,%EF%BB%BFnumero%2Cempresa%2Crfc%2Cfecha%2Ctotal%2Cestado%2Cproyecto%2Ccomentarios%0AOC-2026-0001%2CCIAE%2CCME880201XY3%2C2026-04-15%2C150000.00%2Caprobada%2CPRY-2024-031%2CAnticipo%20cemento%0AOC-2026-0002%2CPSE%2CFVN150607BR2%2C2026-04-18%2C28500.50%2Crecibida%2C%2CTornilleria%0A"
            download="plantilla_ocs.csv"
            className="text-[12px] text-brand hover:underline"
          >
            📥 Descargar plantilla CSV
          </a>
        </div>
      </section>

      {/* Upload */}
      <section className="rounded-md border border-border bg-card p-5 shadow-xs">
        <h2 className="mb-3 text-[14px] font-semibold">Subir archivo</h2>
        <input
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleFile}
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
        />
        {filename && (
          <p className="mt-2 text-[12px] text-ink-3">
            <FileSpreadsheet className="mr-1 inline h-3 w-3" />
            {filename}
          </p>
        )}
      </section>

      {/* Preview */}
      {parsed && (
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-3 text-[14px] font-semibold">Vista previa</h2>
          <div className="mb-4 grid grid-cols-3 gap-4">
            <Stat
              label="Filas válidas"
              value={parsed.rows.length}
              color="var(--ok-deep)"
            />
            <Stat
              label="Errores de parseo"
              value={parsed.errores.length}
              color="var(--danger-deep)"
            />
            <Stat
              label="Suma total"
              value={fmtMxn.format(
                parsed.rows.reduce((a, r) => a + r.total, 0),
              )}
            />
          </div>

          {parsed.errores.length > 0 && (
            <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <p className="mb-2 text-[12.5px] font-semibold text-destructive">
                {parsed.errores.length} errores de parseo:
              </p>
              <ul className="text-[11.5px] text-destructive">
                {parsed.errores.slice(0, 10).map((e, i) => (
                  <li key={i}>
                    Fila {e.row}: {e.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.rows.length > 0 && (
            <>
              <p className="mb-2 text-[11px] text-ink-3">
                Primeras 10 filas:
              </p>
              <TableSurface>
                <Table>
                  <TableHeader>
                    <TableRow interactive={false}>
                      <TableHead>OC</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>RFC Prov.</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead align="right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.slice(0, 10).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">
                          {r.numero}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.empresa_codigo}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.rfc_proveedor}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.fecha_emision}
                        </TableCell>
                        <TableCell align="right" mono>
                          {fmtMxn.format(r.total)}
                        </TableCell>
                        <TableCell className="text-xs capitalize">
                          {r.estado}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableSurface>

              <div className="mt-4 flex gap-2">
                <Button onClick={importar} disabled={pending}>
                  <Upload className="h-4 w-4" />
                  {pending
                    ? "Importando…"
                    : `Importar ${parsed.rows.length} OCs`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setParsed(null);
                    setFilename(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </section>
      )}

      {/* Resultado */}
      {result && (
        <section
          className={`rounded-md border p-5 shadow-xs ${
            result.errores === 0
              ? "border-ok/40 bg-ok-soft/40"
              : "border-warn/40 bg-warn-soft/40"
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-ok-deep" />
            <h2 className="text-[14px] font-semibold">Resultado</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Stat label="Total filas" value={result.total} />
            <Stat
              label="Insertados"
              value={result.insertados}
              color="var(--ok-deep)"
            />
            <Stat
              label="Duplicados"
              value={result.duplicados}
              color="var(--ink-3)"
            />
            <Stat
              label="Errores"
              value={result.errores}
              color={result.errores > 0 ? "var(--danger-deep)" : undefined}
            />
          </div>
          {result.detalleErrores.length > 0 && (
            <div className="mt-3 rounded-md bg-card p-3">
              <p className="mb-2 text-[12px] font-semibold">
                Detalle de errores:
              </p>
              <ul className="space-y-0.5 text-[11.5px] text-ink-2">
                {result.detalleErrores.map((e, i) => (
                  <li key={i}>
                    {e.row > 0 ? `Fila ${e.row}` : "—"}: {e.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Link href="/finanzas/oc">
              <Button variant="outline">Ver OCs</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setParsed(null);
                setResult(null);
                setFilename(null);
              }}
            >
              Importar otro archivo
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
