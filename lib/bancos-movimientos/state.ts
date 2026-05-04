/**
 * Estados de los Server Actions de movimientos bancarios manuales.
 *
 * Vive aparte del archivo `actions.ts` (que tiene `"use server"`) porque
 * los archivos con esa directiva solo pueden exportar funciones async.
 */

export type MovimientoManualState = {
  ok: boolean;
  error: string | null;
  movimientoId?: string;
};

export const initialMovimientoManualState: MovimientoManualState = {
  ok: false,
  error: null,
};

export type ImportCSVState = {
  ok: boolean;
  error: string | null;
  importados?: number;
  duplicados?: number;
  errores?: Array<{ fila: number; mensaje: string }>;
};

export const initialImportCSVState: ImportCSVState = {
  ok: false,
  error: null,
};

/** Etiquetas y color por origen de movimiento bancario. */
export const ETIQUETA_ORIGEN: Record<string, string> = {
  manual: "Manual",
  csv_manual: "CSV",
  edocta_ia: "Edocta",
  belvo: "Belvo",
};

export const COLOR_ORIGEN: Record<string, string> = {
  manual: "bg-amber-100 text-amber-800",
  csv_manual: "bg-blue-100 text-blue-800",
  edocta_ia: "bg-emerald-100 text-emerald-800",
  belvo: "bg-violet-100 text-violet-800",
};

/** Origen es "manual" o "csv_manual" → editable/eliminable. */
export function esOrigenEditable(origen: string | null | undefined): boolean {
  return origen === "manual" || origen === "csv_manual";
}
