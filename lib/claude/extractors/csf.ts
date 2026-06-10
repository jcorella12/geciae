import { z } from "zod";

import { normalizeEstadoMx, RFC_REGEX } from "@/lib/cfdi/catalogos-sat";

import { extractFromDocument, type ExtractResult } from "../extract";

/**
 * Esquema esperado del CSF (Constancia de Situación Fiscal del SAT).
 *
 * Solo capturamos los campos que poblan el form de cliente/proveedor.
 * Si la IA no encuentra algún dato, debe regresar `null` (no inventar).
 */
const CSFSchema = z.object({
  razon_social: z.string().nullable(),
  nombre_comercial: z.string().nullable().optional(),
  rfc: z.string().regex(RFC_REGEX).nullable(),
  curp: z.string().nullable().optional(),
  regimen_fiscal_codigo: z
    .string()
    .regex(/^\d{3}$/, "código SAT 3 dígitos")
    .nullable(),
  cp_fiscal: z
    .string()
    .regex(/^\d{5}$/)
    .nullable(),
  domicilio: z
    .object({
      calle: z.string().nullable().optional(),
      numero_exterior: z.string().nullable().optional(),
      numero_interior: z.string().nullable().optional(),
      colonia: z.string().nullable().optional(),
      municipio: z.string().nullable().optional(),
      estado: z
        .string()
        .nullable()
        .optional()
        .transform((v) => normalizeEstadoMx(v)),
    })
    .nullable()
    .optional(),
  representante_legal: z.string().nullable().optional(),
  rfc_representante: z.string().nullable().optional(),
  fecha_alta_sat: z.string().nullable().optional(),
});

export type DatosCSF = z.infer<typeof CSFSchema>;

const SYSTEM = `Eres un asistente que extrae datos fiscales de Constancias de Situación Fiscal (CSF) emitidas por el SAT de México.

REGLAS ESTRICTAS:
- Devuelve SOLO un objeto JSON válido, sin markdown, sin explicación, sin comentarios.
- Si un dato NO aparece en el documento, usa null. NO inventes nada.
- El RFC debe tener 12 caracteres (persona moral) o 13 (persona física), letras MAYÚSCULAS.
- El régimen fiscal es un código de 3 dígitos del SAT (601, 612, 626, etc.).
- El CP fiscal son exactamente 5 dígitos.
- Estado del domicilio: usa el nombre completo del estado mexicano tal cual aparece en el catálogo SAT (ej. "Sonora", "Ciudad de México", "Estado de México").
- Si el documento no es un CSF (otra cosa), regresa todos los campos como null y agrega "_es_csf": false.`;

const USER = `Extrae los datos fiscales de este CSF y devuélvelos como JSON con esta estructura exacta:

{
  "razon_social": string | null,
  "nombre_comercial": string | null,
  "rfc": string | null,
  "curp": string | null,
  "regimen_fiscal_codigo": string | null,
  "cp_fiscal": string | null,
  "domicilio": {
    "calle": string | null,
    "numero_exterior": string | null,
    "numero_interior": string | null,
    "colonia": string | null,
    "municipio": string | null,
    "estado": string | null
  } | null,
  "representante_legal": string | null,
  "rfc_representante": string | null,
  "fecha_alta_sat": "YYYY-MM-DD" | null
}

Devuelve SOLO el JSON. Sin texto adicional.`;

export async function extraerCSF(opts: {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";
  modulo: "comercial" | "finanzas";
  empresaId?: string | null;
}): Promise<ExtractResult<DatosCSF>> {
  return extractFromDocument({
    tarea: "csf_lectura",
    modulo: opts.modulo,
    systemPrompt: SYSTEM,
    userPrompt: USER,
    base64: opts.base64,
    mediaType: opts.mediaType,
    parse: (raw) => CSFSchema.parse(JSON.parse(raw)),
    empresaId: opts.empresaId,
    scoreConfidence: (d) => {
      // Confidence simple: % de campos críticos extraídos.
      const criticos = [d.razon_social, d.rfc, d.regimen_fiscal_codigo, d.cp_fiscal];
      const llenos = criticos.filter((v) => v !== null && v !== "").length;
      return llenos / criticos.length;
    },
  });
}
