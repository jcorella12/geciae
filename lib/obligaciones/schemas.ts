import { z } from "zod";

const idObligacion = z.string().uuid("Obligación inválida");
const numero = z.coerce.number().nonnegative();

export const MarcarPresentadaSchema = z.object({
  obligacion_id: idObligacion,
  numero_operacion: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  monto_calculado: numero.optional().nullable(),
  fecha_presentacion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  observaciones: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const MarcarPagadaSchema = z.object({
  obligacion_id: idObligacion,
  monto_pagado: numero,
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  saldo_a_favor: numero.optional().nullable(),
  observaciones: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const MarcarNoAplicaSchema = z.object({
  obligacion_id: idObligacion,
  observaciones: z
    .string()
    .trim()
    .min(5, "Justifica por qué no aplica (mínimo 5 caracteres)")
    .max(2000),
});

export const MarcarRechazadaSchema = z.object({
  obligacion_id: idObligacion,
  observaciones: z
    .string()
    .trim()
    .min(5, "Indica el motivo del rechazo")
    .max(2000),
});

export const ActualizarFechaSchema = z.object({
  obligacion_id: idObligacion,
  fecha_vencimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

export const ActualizarObservacionesSchema = z.object({
  obligacion_id: idObligacion,
  observaciones: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const RevertirEstadoSchema = z.object({
  obligacion_id: idObligacion,
  motivo: z
    .string()
    .trim()
    .min(5, "Indica el motivo de la reversión")
    .max(2000),
});

export const GenerarAnualesSchema = z.object({
  empresa_id: z.string().uuid(),
  anio: z.coerce
    .number()
    .int()
    .min(2020, "Año fuera de rango")
    .max(2100, "Año fuera de rango"),
});
