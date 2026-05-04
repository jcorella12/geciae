import { z } from "zod";

import { TIPOS_DOC_EFM } from "./state";

const idEFM = z.string().uuid("EFM inválido");

export const SubirPaqueteSchema = z.object({
  empresa_id: z.string().uuid(),
  anio: z.coerce.number().int().min(2020).max(2099),
  mes: z.coerce.number().int().min(1).max(12),
});

export const SubirDocumentoIndividualSchema = z.object({
  efm_id: idEFM,
  tipo_doc: z.enum(TIPOS_DOC_EFM),
});

export const EliminarDocumentoSchema = z.object({
  efm_id: idEFM,
  tipo_doc: z.enum(TIPOS_DOC_EFM),
});

export const MarcarFirmadosSchema = z.object({
  efm_id: idEFM,
  firmados: z.coerce.boolean(),
});

export const ActualizarObservacionesEFMSchema = z.object({
  efm_id: idEFM,
  observaciones: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

const numero = z.coerce.number().optional().nullable();

export const ActualizarKPIsManualSchema = z.object({
  efm_id: idEFM,
  utilidad_neta: numero,
  ingresos_totales: numero,
  egresos_totales: numero,
  iva_trasladado: numero,
  iva_acreditable: numero,
  flujo_efectivo: numero,
});

/** Schema para validar la respuesta JSON de Claude al extraer KPIs. */
export const KPIsExtraidoSchema = z.object({
  utilidad_neta: z.number().nullable(),
  ingresos_totales: z.number().nullable(),
  egresos_totales: z.number().nullable(),
  iva_trasladado: z.number().nullable(),
  iva_acreditable: z.number().nullable(),
  flujo_efectivo: z.number().nullable(),
  confidence: z.number().min(0).max(1).optional(),
});

export type KPIsExtraido = z.infer<typeof KPIsExtraidoSchema>;
