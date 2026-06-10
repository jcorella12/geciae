import { z } from "zod";

import { CURP_REGEX, normalizeEstadoMx } from "@/lib/cfdi/catalogos-sat";

import { extractFromDocument, type ExtractResult } from "../extract";

/**
 * Esquema de extracción de INE / IFE (credencial de elector mexicana).
 */
const INESchema = z.object({
  nombre_completo: z.string().nullable(),
  curp: z.string().regex(CURP_REGEX).nullable(),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  genero: z.enum(["M", "F"]).nullable(),
  domicilio: z
    .object({
      calle: z.string().nullable().optional(),
      numero_exterior: z.string().nullable().optional(),
      colonia: z.string().nullable().optional(),
      municipio: z.string().nullable().optional(),
      estado: z
        .string()
        .nullable()
        .optional()
        .transform((v) => normalizeEstadoMx(v)),
      cp: z.string().regex(/^\d{5}$/).nullable().optional(),
    })
    .nullable()
    .optional(),
  clave_elector: z.string().nullable().optional(),
  vigencia: z.string().nullable().optional(),
});

export type DatosINE = z.infer<typeof INESchema>;

const SYSTEM = `Eres un asistente que extrae datos personales de credenciales de elector INE/IFE de México.

REGLAS ESTRICTAS:
- Devuelve SOLO un objeto JSON válido, sin markdown, sin explicación.
- Si un dato no aparece, usa null. NO inventes.
- El nombre completo en formato "NOMBRES APELLIDO_PATERNO APELLIDO_MATERNO" en MAYÚSCULAS si así está en el documento.
- Fecha de nacimiento en formato YYYY-MM-DD.
- Género: "M" o "F" (cómo aparece "SEXO H/M" en el INE → H=M, M=F).
- CURP: 18 caracteres alfanuméricos.
- Estado: nombre completo del estado mexicano.
- Si el documento no es una INE/IFE, regresa todos los campos como null.`;

const USER = `Extrae los datos personales de este INE/IFE y devuélvelos como JSON con esta estructura exacta:

{
  "nombre_completo": string | null,
  "curp": string | null,
  "fecha_nacimiento": "YYYY-MM-DD" | null,
  "genero": "M" | "F" | null,
  "domicilio": {
    "calle": string | null,
    "numero_exterior": string | null,
    "colonia": string | null,
    "municipio": string | null,
    "estado": string | null,
    "cp": string | null
  } | null,
  "clave_elector": string | null,
  "vigencia": string | null
}

Devuelve SOLO el JSON.`;

export async function extraerINE(opts: {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";
  empresaId?: string | null;
}): Promise<ExtractResult<DatosINE>> {
  return extractFromDocument({
    tarea: "ine_lectura",
    modulo: "personas",
    systemPrompt: SYSTEM,
    userPrompt: USER,
    base64: opts.base64,
    mediaType: opts.mediaType,
    parse: (raw) => INESchema.parse(JSON.parse(raw)),
    empresaId: opts.empresaId,
    scoreConfidence: (d) => {
      const criticos = [d.nombre_completo, d.curp, d.fecha_nacimiento];
      const llenos = criticos.filter((v) => v !== null && v !== "").length;
      return llenos / criticos.length;
    },
  });
}
