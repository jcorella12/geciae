/**
 * Helpers para exportar arrays de objetos a CSV.
 * Compatible con Excel/Numbers/Google Sheets sin libs externas.
 */

/**
 * Escapa un valor para CSV (RFC 4180):
 * - Si contiene "," "\n" o "\"" → envuelve en comillas dobles y duplica internas
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === "object") {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export type CsvColumn<T> = {
  key: keyof T | string;
  label: string;
  /** Transform value before writing. */
  format?: (row: T) => unknown;
};

/**
 * Convierte un array de objetos a un string CSV con encabezado.
 * Incluye BOM UTF-8 para que Excel lo abra con acentos correctos.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: CsvColumn<T>[],
): string {
  const BOM = "﻿";
  const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const val = c.format ? c.format(row) : (row as Record<string, unknown>)[c.key as string];
        return escapeCsvValue(val);
      })
      .join(","),
  );
  return BOM + header + "\n" + lines.join("\n");
}

/**
 * Genera Response con headers correctos para descarga de CSV.
 */
export function csvResponse(content: string, filename: string): Response {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      "Cache-Control": "no-store",
    },
  });
}
