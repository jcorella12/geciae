import { z } from "zod";

import { extractFromDocument, type ExtractResult } from "../extract";

const ConceptoSchema = z.object({
  descripcion: z.string().nullable(),
  cantidad: z.number().nullable(),
  unidad: z.string().nullable().optional(),
  precio_unitario: z.number().nullable(),
  iva_tasa: z.number().nullable().optional(),
});

const CotizacionSchema = z.object({
  proveedor: z
    .object({
      razon_social: z.string().nullable(),
      rfc: z.string().nullable(),
    })
    .nullable()
    .optional(),
  numero_cotizacion: z.string().nullable().optional(),
  fecha_cotizacion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  validez_dias: z.number().int().nullable().optional(),
  condiciones_pago: z.string().nullable().optional(),
  conceptos: z.array(ConceptoSchema),
  subtotal: z.number().nullable().optional(),
  iva: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
});

export type DatosCotizacion = z.infer<typeof CotizacionSchema>;

const SYSTEM = `Eres un asistente que extrae datos de cotizaciones, presupuestos o facturas (CFDI PDF) emitidos por proveedores en México.

REGLAS ESTRICTAS:
- Devuelve SOLO un objeto JSON válido, sin markdown, sin explicación.
- Si un dato no aparece, usa null. NO inventes nada.
- Los conceptos son los renglones / partidas del documento.
- "cantidad" y "precio_unitario" son números (no strings con "$" o ",").
- "iva_tasa" en fracción: 0.16 para 16%, 0.08 para 8%, 0 para exento. Si no aparece, asume 0.16.
- "unidad": valor literal del documento (PZA, SERV, KG, M2, etc.). Si no aparece, null.
- "subtotal", "iva", "total" son los montos del documento. Si no los ves, null.
- "validez_dias": si dice "Cotización válida 30 días" → 30.
- El RFC del proveedor: 12 chars (PM) o 13 (PF), solo letras mayúsculas y dígitos.
- Si el documento no es una cotización ni factura, regresa conceptos: [] y proveedor: null.`;

const USER = `Extrae los datos de esta cotización/factura y devuélvelos como JSON con esta estructura exacta:

{
  "proveedor": {
    "razon_social": string | null,
    "rfc": string | null
  } | null,
  "numero_cotizacion": string | null,
  "fecha_cotizacion": "YYYY-MM-DD" | null,
  "validez_dias": number | null,
  "condiciones_pago": string | null,
  "conceptos": [
    {
      "descripcion": string,
      "cantidad": number,
      "unidad": string | null,
      "precio_unitario": number,
      "iva_tasa": number
    }
  ],
  "subtotal": number | null,
  "iva": number | null,
  "total": number | null
}

Devuelve SOLO el JSON.`;

export async function extraerCotizacion(opts: {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";
  empresaId?: string | null;
}): Promise<ExtractResult<DatosCotizacion>> {
  return extractFromDocument({
    tarea: "cotizacion_lectura",
    modulo: "finanzas",
    systemPrompt: SYSTEM,
    userPrompt: USER,
    base64: opts.base64,
    mediaType: opts.mediaType,
    parse: (raw) => CotizacionSchema.parse(JSON.parse(raw)),
    empresaId: opts.empresaId,
    scoreConfidence: (d) => {
      // Confidence: tiene conceptos válidos + total/subtotal coherente.
      if (!d.conceptos || d.conceptos.length === 0) return 0;
      const conceptosValidos = d.conceptos.filter(
        (c) =>
          c.descripcion &&
          c.cantidad != null &&
          c.cantidad > 0 &&
          c.precio_unitario != null &&
          c.precio_unitario >= 0,
      ).length;
      const ratio = conceptosValidos / d.conceptos.length;
      // Bonus si trae proveedor y total.
      const meta = (d.proveedor?.rfc ? 0.1 : 0) + (d.total != null ? 0.1 : 0);
      return Math.min(1, ratio * 0.8 + meta);
    },
  });
}
