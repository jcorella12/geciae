/**
 * Clasificador de documentos del paquete mensual del despacho contable.
 *
 * Recibe un nombre de archivo y devuelve el tipo_doc estandarizado, o null
 * si no se reconoce.
 *
 * Patrones portados de scripts/upload_estados_financieros.py.
 */

import type { TipoDocEFM } from "./state";

const PATTERNS: Array<[TipoDocEFM, RegExp]> = [
  ["balance_general", /(^|[^0-9])1\.|posici[oó]n\s+financiera|balance\s+general/i],
  ["estado_resultados", /(^|[^0-9])2\.|estado\s+de\s+resultados/i],
  ["balanza", /(^|[^0-9])3\.|balanza\s+de\s+comprobaci[oó]n/i],
  ["flujo_efectivo", /(^|[^0-9])4\.|flujo\s+de\s+efectivo/i],
  ["anexos_ingresos", /(^|[^0-9])5\.|anexos.*ingresos|cat[aá]logo\s+ingresos/i],
  ["anexos_egresos", /(^|[^0-9])6\.|anexos.*egresos|cat[aá]logo\s+egresos/i],
  ["conciliacion_iva", /(^|[^0-9])7\.|conciliaci[oó]n\s+de\s+iva/i],
  ["iva_trasladado", /(^|[^0-9])8\.|iva\s+trasladado/i],
  ["iva_acreditable", /(^|[^0-9])9\.|iva\s+acreditable/i],
  ["subsidio", /(^|[^0-9])10\.|subsidio/i],
  ["impuestos_por_pagar", /(^|[^0-9])11\.|impuesto[s]?\s+por\s+pagar/i],
  ["bancos", /(^|[^0-9])12\.|movimientos.*cat[aá]logo|^bancos|\sbancos\.|bancos\s+/i],
  ["polizas", /(^|[^0-9])13\.|diarios|p[oó]lizas/i],
];

/**
 * Clasifica un nombre de archivo al tipo_doc del paquete EFM.
 *
 * Ejemplos:
 *   "1.Balance General Marzo 2026.pdf" → "balance_general"
 *   "2_Estado de Resultados.pdf"        → "estado_resultados"
 *   "Polizas Mar26.pdf"                 → "polizas"
 *   "balance_general.pdf"               → "balance_general"  (slug literal)
 *   "factura_xyz.pdf"                   → null
 */
export function clasificarDocumento(filename: string): TipoDocEFM | null {
  const base = filename
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  // Slug literal al inicio (cuando el wizard renombra el archivo al tipo).
  for (const [tipo] of PATTERNS) {
    if (base.toLowerCase().startsWith(`${tipo}.`)) return tipo;
  }
  for (const [tipo, re] of PATTERNS) {
    if (re.test(base)) return tipo;
  }
  return null;
}

/**
 * Sanitiza un nombre de archivo para uso en path de Supabase Storage.
 * Mantiene la extensión.
 */
export function safeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
}
