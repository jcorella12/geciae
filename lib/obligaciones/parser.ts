/**
 * Parser de comprobantes SAT y acuses.
 * Extrae campos clave para registrar la obligación automáticamente.
 *
 * Comprobante de pago referenciado SAT:
 *   Línea de Captura: 0425 6BR4 8500 4729 6422
 *   Importe Pagado: $4,907
 *   Fecha y Hora de Pago: 15/09/2025 14:32 Hrs.
 *   Número de Operación: 122585724024
 *
 * Acuse de declaración:
 *   Cantidad a pagar: 4,907 (varios conceptos sumados)
 *   Línea de captura (5 grupos de 4 alfanuméricos)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (b: Buffer) => Promise<{ text: string }>;

export type DatosComprobante = {
  linea_captura: string | null;
  monto_pagado: number | null;
  fecha_pago: string | null; // ISO YYYY-MM-DD
  numero_operacion: string | null;
};

export type TipoObligacion =
  | "iva_mensual"
  | "isr_provisional"
  | "isr_retenciones"
  | "iva_retenciones"
  | "diot"
  | "otra";

export type DatosAcuse = {
  linea_captura: string | null;
  monto_calculado: number | null;
  conceptos: Array<{
    concepto: string;
    cantidad: number;
    tipo: TipoObligacion | null;
  }>;
};

const CONCEPTO_TIPO_MAP: Array<{ rx: RegExp; tipo: TipoObligacion }> = [
  { rx: /ISR\s*retenc(iones)?\s*por\s*salarios?/i, tipo: "isr_retenciones" },
  {
    rx: /ISR\s*retenc(iones)?\s+(RESICO|honorarios|arrendamiento)/i,
    tipo: "isr_retenciones",
  },
  { rx: /ISR\s*personas?\s*morales?/i, tipo: "isr_provisional" },
  { rx: /ISR\s*provisional/i, tipo: "isr_provisional" },
  {
    rx: /Impuesto\s*al\s*Valor\s*Agregado.*Personas?\s*morales?/i,
    tipo: "iva_mensual",
  },
  { rx: /IVA\s*personas?\s*morales?/i, tipo: "iva_mensual" },
  { rx: /IVA\s*retenc(iones)?/i, tipo: "iva_retenciones" },
];

function clasificarConcepto(textoConcepto: string): TipoObligacion | null {
  if (!textoConcepto) return null;
  // Normalizar — los PDFs vienen sin espacios a veces
  const norm = textoConcepto
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\./g, " ")
    .trim();
  for (const { rx, tipo } of CONCEPTO_TIPO_MAP) {
    if (rx.test(norm)) return tipo;
  }
  return null;
}

async function extraerTextoPdf(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text || "";
}

export async function parsearComprobantePago(
  buffer: Buffer,
): Promise<DatosComprobante> {
  const txt = await extraerTextoPdf(buffer);
  const out: DatosComprobante = {
    linea_captura: null,
    monto_pagado: null,
    fecha_pago: null,
    numero_operacion: null,
  };

  // Importe Pagado
  let m = txt.match(/Importe\s*Pagado[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  if (m) {
    out.monto_pagado = parseFloat(m[1].replace(/,/g, ""));
  }

  // Fecha y Hora de Pago
  m = txt.match(/Fecha\s*y\s*Hora\s*de\s*Pago[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (m) {
    out.fecha_pago = `${m[3]}-${m[2]}-${m[1]}`;
  }

  // Número de Operación
  m = txt.match(/N[úu]mero\s*de\s*Operaci[óo]n[:\s]*(\d{8,15})/i);
  if (m) {
    out.numero_operacion = m[1];
  }

  // Línea de Captura: 5 grupos de 4 alfanuméricos
  m = txt.match(
    /L[íi]nea\s*de\s*Captura[:\s]*([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})/i,
  );
  if (m) {
    out.linea_captura = (m[1] + m[2] + m[3] + m[4] + m[5]).toUpperCase();
  }

  return out;
}

export async function parsearAcuseDeclaracion(
  buffer: Buffer,
): Promise<DatosAcuse> {
  const txt = await extraerTextoPdf(buffer);
  const out: DatosAcuse = {
    linea_captura: null,
    monto_calculado: null,
    conceptos: [],
  };

  // "Cantidad a pagar" — puede aparecer varias veces (1 por concepto)
  const cantRegex = /Cantidad\s*a\s*pagar[:\s]*([\d,]+(?:\.\d{2})?)/gi;
  let total = 0;
  let m: RegExpExecArray | null;
  while ((m = cantRegex.exec(txt)) !== null) {
    total += parseFloat(m[1].replace(/,/g, ""));
  }
  if (total > 0) {
    out.monto_calculado = total;
  }

  // Conceptos: split por "Concepto de pago N:" y luego dentro de cada bloque
  // extraer el nombre y la "Cantidad a pagar".
  const bloques = txt.split(/Concepto\s*de\s*pago\s*\d+\s*[:.]?\s*/i);
  for (const bloque of bloques.slice(1)) {
    const nombreMatch = bloque.match(
      /^\s*([^\n]+?)\s*(?=A\s*cargo|Acargo|A\s*favor|Afavor|Cantidad)/i,
    );
    const nombre = nombreMatch ? nombreMatch[1].trim() : "";
    const cantMatch = bloque.match(
      /Cantidad\s*a\s*pagar[:\s]*([\d,]+(?:\.\d{2})?)/i,
    );
    if (!cantMatch) continue;
    const cantidad = parseFloat(cantMatch[1].replace(/,/g, ""));
    out.conceptos.push({
      concepto: nombre,
      cantidad,
      tipo: clasificarConcepto(nombre),
    });
  }

  // Línea de captura (formato acuse: 5 grupos de 4)
  const lineaRegex = /\b([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})\b/;
  const lm = txt.match(lineaRegex);
  if (lm) {
    out.linea_captura = (lm[1] + lm[2] + lm[3] + lm[4] + lm[5]).toUpperCase();
  }

  return out;
}
