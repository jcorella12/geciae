import { z } from "zod";

import { ESTADOS_LEVANTAMIENTO } from "./state";

const idLev = z.string().uuid();

export const CrearLevantamientoSchema = z.object({
  empresa_id: z.string().uuid("Empresa inválida"),
  oportunidad_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  cliente_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  ingeniero_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_solicitud: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  fecha_propuesta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  observaciones: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const ActualizarLevantamientoSchema = z.object({
  levantamiento_id: idLev,
  fecha_propuesta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null))
    .nullable(),
  fecha_realizada: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null))
    .nullable(),
  ingeniero_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null))
    .nullable(),
  horas_ingeniero: z.coerce.number().min(0).optional().nullable(),
  viaticos: z.coerce.number().min(0).optional().nullable(),
  kilometraje: z.coerce.number().min(0).optional().nullable(),
  resultado_descripcion: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable(),
  url_informe: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null))
    .nullable(),
  observaciones: z.string().trim().max(2000).optional().nullable(),
});

export const CompletarPasoSchema = z.object({
  levantamiento_id: idLev,
  paso_numero: z.coerce.number().int().min(1).max(6),
  observaciones: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const CambiarEstadoLevSchema = z.object({
  levantamiento_id: idLev,
  estado: z.enum(ESTADOS_LEVANTAMIENTO as [string, ...string[]]),
  proyecto_destino_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const CrearTarifaSchema = z.object({
  empresa_id: z.string().uuid(),
  concepto: z.string().trim().min(2).max(60),
  unidad: z.string().trim().min(1).max(20),
  costo_unitario: z.coerce.number().nonnegative(),
  vigente_desde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  vigente_hasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  observaciones: z.string().trim().max(500).optional().nullable(),
});
