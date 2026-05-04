import { z } from "zod";

export const LineaCreditoSchema = z
  .object({
    empresa_acreedora_id: z.string().uuid(),
    empresa_deudora_id: z.string().uuid(),
    monto_autorizado: z.coerce.number().positive(),
    vigencia_inicio: z.string().min(10),
    vigencia_fin: z.string().min(10),
    tasa_base: z.string().default("tiie_28"),
    spread: z.coerce
      .number()
      .min(0)
      .max(1)
      .default(0.06),
    capitaliza_intereses: z
      .union([z.literal("on"), z.literal("true"), z.boolean(), z.undefined()])
      .transform((v) => v === true || v === "on" || v === "true"),
    dia_corte: z.coerce.number().int().min(1).max(31).default(31),
    observaciones: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
  })
  .refine((d) => d.empresa_acreedora_id !== d.empresa_deudora_id, {
    message: "La acreedora y la deudora deben ser diferentes.",
    path: ["empresa_deudora_id"],
  })
  .refine((d) => new Date(d.vigencia_fin) > new Date(d.vigencia_inicio), {
    message: "La vigencia fin debe ser posterior al inicio.",
    path: ["vigencia_fin"],
  });

export const PrestamoSolicitudSchema = z.object({
  linea_id: z.string().uuid(),
  monto: z.coerce.number().positive(),
  motivo: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_vencimiento: z
    .string()
    .min(10)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const PrestamoPagoSchema = z.object({
  monto_pago: z.coerce.number().positive(),
  fecha_pago: z.string().min(10).optional(),
  observaciones: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});
