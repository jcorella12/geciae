import { z } from "zod";

import { extractFromDocument, type ExtractResult } from "../extract";

/**
 * Schema esperado al extraer un ticket de viático con IA.
 * Para usar en /personas/[id]/viaticos cuando el usuario sube foto del ticket.
 */
const TicketSchema = z.object({
  fecha: z.string().nullable().describe("YYYY-MM-DD"),
  monto_total: z.number().positive().nullable(),
  subtotal: z.number().nullable().optional(),
  iva: z.number().nullable().optional(),
  rfc_emisor: z.string().nullable().optional(),
  nombre_establecimiento: z.string().nullable(),
  concepto: z.string().nullable(),
  categoria: z
    .enum([
      "hospedaje",
      "alimentos",
      "transporte",
      "combustible",
      "peajes",
      "estacionamiento",
      "papeleria",
      "telefono",
      "otros",
    ])
    .nullable(),
  ciudad: z.string().nullable().optional(),
  forma_pago: z.string().nullable().optional(),
  tiene_factura: z.boolean().nullable().optional(),
});

export type DatosTicket = z.infer<typeof TicketSchema>;

const SYSTEM = `Eres un asistente que extrae datos de tickets de gastos / viáticos en México.

REGLAS ESTRICTAS:
- Solo extrae datos visibles en la imagen. Si no aparece, devuelve null. NUNCA inventes.
- Las fechas en formato ISO YYYY-MM-DD.
- Monto total con punto como separador decimal (no comas en miles).
- Si el ticket es factura (tiene RFC del emisor + folio), marca tiene_factura = true.
- categoria debe ser una de: hospedaje, alimentos, transporte, combustible, peajes, estacionamiento, papeleria, telefono, otros.
  - Hotel/hospedaje → hospedaje
  - Restaurante/comida/cafetería → alimentos
  - Uber/taxi/avión/autobús → transporte
  - Gasolinera/gasolina → combustible
  - Caseta de cobro → peajes
  - Estacionamiento → estacionamiento
  - Office Depot/papelería → papeleria
  - Telmex/teléfono móvil → telefono
  - Cualquier otro → otros
- "concepto" es una descripción corta y útil (≤80 chars), p.ej. "Comida con cliente · Restaurante La Casa" o "Gasolina ruta a obra".

FORMATO DE SALIDA:
Devuelve SOLO un JSON con esta forma exacta. Sin texto adicional, sin markdown:
{
  "fecha": "YYYY-MM-DD" | null,
  "monto_total": number | null,
  "subtotal": number | null,
  "iva": number | null,
  "rfc_emisor": "string" | null,
  "nombre_establecimiento": "string" | null,
  "concepto": "string" | null,
  "categoria": "hospedaje" | "alimentos" | "transporte" | "combustible" | "peajes" | "estacionamiento" | "papeleria" | "telefono" | "otros" | null,
  "ciudad": "string" | null,
  "forma_pago": "string" | null,
  "tiene_factura": boolean | null
}`;

export async function extraerTicket(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf",
  empresaId?: string | null,
): Promise<ExtractResult<DatosTicket>> {
  return extractFromDocument({
    tarea: "ticket_viatico",
    modulo: "personas",
    systemPrompt: SYSTEM,
    userPrompt:
      "Extrae los datos del ticket en JSON usando el formato indicado. Si algún campo no es visible o es ilegible, devuélvelo como null.",
    base64,
    mediaType,
    parse: (raw) => TicketSchema.parse(JSON.parse(raw)),
    empresaId,
    modelo: "haiku", // ticket simple — usa modelo barato
    scoreConfidence: (d) => {
      let score = 0.4;
      if (d.fecha) score += 0.15;
      if (d.monto_total) score += 0.2;
      if (d.categoria) score += 0.1;
      if (d.nombre_establecimiento) score += 0.1;
      if (d.rfc_emisor) score += 0.05;
      return Math.min(1, score);
    },
  });
}
