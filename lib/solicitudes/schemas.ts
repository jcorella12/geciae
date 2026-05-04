import { z } from "zod";

import { TIPOS_SOLICITUD } from "./state";

const idSol = z.string().uuid("Solicitud inválida");

export const CrearSolicitudSchema = z.object({
  proyecto_id: z.string().uuid(),
  tipo: z.enum(TIPOS_SOLICITUD as [string, ...string[]]),
  titulo: z
    .string()
    .trim()
    .min(3, "Título muy corto")
    .max(200),
  descripcion: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  monto_estimado: z.coerce.number().nonnegative().optional().nullable(),
  urgencia: z.enum(["baja", "normal", "alta", "critica"]).default("normal"),
  campos_tipo: z
    .record(z.string(), z.unknown())
    .optional()
    .default({}),
});

export const ActualizarSolicitudSchema = z.object({
  solicitud_id: idSol,
  titulo: z.string().trim().min(3).max(200).optional(),
  descripcion: z.string().trim().max(4000).optional().nullable(),
  monto_estimado: z.coerce.number().nonnegative().optional().nullable(),
  urgencia: z
    .enum(["baja", "normal", "alta", "critica"])
    .optional(),
});

export const AprobarSchema = z.object({
  solicitud_id: idSol,
  comentario: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const RechazarSchema = z.object({
  solicitud_id: idSol,
  razon: z
    .string()
    .trim()
    .min(5, "Indica el motivo del rechazo (mínimo 5 caracteres)")
    .max(2000),
});

export const CerrarSchema = z.object({
  solicitud_id: idSol,
});

export const MarcarEjecutadaSchema = z.object({
  solicitud_id: idSol,
  comentario: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const ComentarioSchema = z.object({
  solicitud_id: idSol,
  texto: z.string().trim().min(1, "Texto vacío").max(4000),
  menciones: z.array(z.string().uuid()).optional().default([]),
});

export const AsignarSchema = z.object({
  solicitud_id: idSol,
  asignado_a_id: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v && v !== "" ? v : null)),
});

export const PasarAEnRevisionSchema = z.object({
  solicitud_id: idSol,
});
