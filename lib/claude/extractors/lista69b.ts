import { z } from "zod";

import { extractFromDocument, type ExtractResult } from "../extract";

/**
 * Resultado de validación 69-B: ¿el RFC aparece o no en la lista del SAT?
 */
const Resultado69BSchema = z.object({
  rfc_consultado: z.string().nullable(),
  aparece_en_lista: z.boolean().nullable(),
  fecha_consulta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  evidencia: z
    .string()
    .nullable()
    .optional()
    .describe("Texto literal extraído del documento que respalda la conclusión"),
  confianza: z.enum(["alta", "media", "baja"]).nullable().optional(),
});

export type Resultado69B = z.infer<typeof Resultado69BSchema>;

const SYSTEM = `Eres un asistente que verifica si un documento confirma que un RFC NO aparece en la lista 69-B del SAT (contribuyentes con operaciones presuntamente inexistentes).

REGLAS ESTRICTAS:
- Devuelve SOLO un objeto JSON válido, sin markdown, sin explicación.
- "rfc_consultado": el RFC que se está verificando en el documento (mayúsculas, sin espacios). Si no lo identificas, null.
- "aparece_en_lista": true si el documento INDICA que el RFC SÍ aparece en la lista 69-B; false si indica que NO aparece (la mayoría de los casos legítimos); null si no es posible determinarlo.
- "fecha_consulta": fecha de la consulta al SAT en formato YYYY-MM-DD si se ve en el documento.
- "evidencia": cita textual breve del documento que respalda la conclusión (máx 200 chars).
- "confianza": "alta" si el documento dice claramente "no se encuentra" o equivalente con el RFC; "media" si la lectura es ambigua; "baja" si solo es un screenshot parcial.
- Si el documento NO es una consulta SAT 69-B, regresa todos los campos null y "evidencia": "Documento no parece ser consulta 69-B".`;

const USER = `Analiza este documento (captura o PDF de la consulta de la lista 69-B del SAT) y devuelve JSON con:

{
  "rfc_consultado": string | null,
  "aparece_en_lista": boolean | null,
  "fecha_consulta": "YYYY-MM-DD" | null,
  "evidencia": string | null,
  "confianza": "alta" | "media" | "baja" | null
}

Devuelve SOLO el JSON.`;

export async function validar69B(opts: {
  base64: string;
  mediaType:
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp"
    | "application/pdf";
}): Promise<ExtractResult<Resultado69B>> {
  return extractFromDocument({
    tarea: "lista_69b_validacion",
    modulo: "finanzas",
    systemPrompt: SYSTEM,
    userPrompt: USER,
    base64: opts.base64,
    mediaType: opts.mediaType,
    parse: (raw) => Resultado69BSchema.parse(JSON.parse(raw)),
    scoreConfidence: (d) => {
      if (d.aparece_en_lista === null) return 0.3;
      if (d.confianza === "alta") return 0.95;
      if (d.confianza === "media") return 0.7;
      if (d.confianza === "baja") return 0.4;
      return 0.6;
    },
  });
}
