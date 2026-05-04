import { z } from "zod";

const ESTADOS = [
  "lead",
  "calificado",
  "visita_tecnica",
  "cotizacion_proceso",
  "cotizacion_enviada",
  "negociacion",
  "ganado",
  "perdido",
] as const;

const FUENTES = [
  "web",
  "redes_sociales",
  "referido",
  "llamada",
  "evento",
  "feria",
  "cliente_existente",
  "prospeccion_directa",
  "otro",
] as const;

export const OportunidadFormSchema = z.object({
  empresa_id: z.string().uuid(),
  cliente_id: z.string().uuid(),
  vendedor_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  nombre: z.string().trim().min(2).max(200),
  descripcion: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  estado: z.enum(ESTADOS).default("lead"),
  monto_estimado: z.coerce.number().nonnegative().optional(),
  probabilidad: z.coerce.number().min(0).max(1).optional(),
  fuente: z
    .enum(FUENTES)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_proxima_accion: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  proxima_accion: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_cierre_estimada: z
    .string()
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

export const ActividadComercialSchema = z.object({
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
  tipo: z.enum([
    "llamada",
    "reunion",
    "correo",
    "visita_tecnica",
    "demo",
    "envio_cotizacion",
    "seguimiento",
    "negociacion",
    "cierre",
    "nota",
  ]),
  fecha: z.string().min(10),
  duracion_minutos: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : v)),
  participantes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  notas: z.string().trim().min(2).max(3000),
  resultado: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export type OportunidadFormData = z.infer<typeof OportunidadFormSchema>;
export type ActividadComercialData = z.infer<typeof ActividadComercialSchema>;
