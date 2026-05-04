import { z } from "zod";

export const ConceptoSchema = z.object({
  orden: z.coerce.number().int().min(1),
  clave_sat: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  descripcion: z.string().trim().min(2).max(500),
  cantidad: z.coerce.number().positive(),
  unidad_sat: z
    .string()
    .trim()
    .max(10)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  precio_unitario: z.coerce.number().positive(),
  descuento: z.coerce.number().min(0).default(0),
  iva_tasa: z.coerce.number().min(0).max(1).default(0.16),
  observaciones: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const CotizacionFormSchema = z.object({
  empresa_id: z.string().uuid(),
  cliente_id: z.string().uuid(),
  oportunidad_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_emision: z.string().min(10),
  vigencia_dias: z.coerce.number().int().min(1).max(365).default(30),
  descuento_global: z.coerce.number().min(0).default(0),
  retenciones: z.coerce.number().min(0).default(0),
  condiciones_pago: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  notas: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  conceptos: z.array(ConceptoSchema).min(1, "Mínimo un concepto"),
});

export type CotizacionFormData = z.infer<typeof CotizacionFormSchema>;
