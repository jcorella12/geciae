import { z } from "zod";

export const OTFormSchema = z
  .object({
    empresa_origen_id: z.string().uuid("Selecciona empresa origen (paga)"),
    empresa_destino_id: z.string().uuid("Selecciona empresa destino (presta)"),
    proyecto_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    servicio_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    descripcion: z.string().trim().min(3, "Descripción muy corta").max(500),
    fecha_solicitud: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    fecha_completacion_esperada: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    cantidad: z.coerce.number().positive("Cantidad debe ser > 0").default(1),
    unidad: z
      .string()
      .trim()
      .max(40)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    costo_base: z.coerce.number().nonnegative("Costo base inválido"),
    margen_aplicado: z.coerce
      .number()
      .min(0, "Margen no puede ser negativo")
      .max(1, "Margen es fracción 0-1, ej. 0.15"),
    iva_tasa: z.coerce.number().min(0).max(1).default(0.16),
    retenciones: z.coerce.number().nonnegative().default(0),
    observaciones: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
  })
  .refine((d) => d.empresa_origen_id !== d.empresa_destino_id, {
    message: "Empresa origen y destino deben ser distintas.",
    path: ["empresa_destino_id"],
  });

export type OTFormData = z.output<typeof OTFormSchema>;

export function calcularTotalesOT(input: {
  cantidad: number;
  costo_base: number;
  margen_aplicado: number;
  iva_tasa: number;
  retenciones?: number;
}) {
  const subtotal = input.cantidad * input.costo_base;
  const precio_inter_co =
    Math.round(subtotal * (1 + input.margen_aplicado) * 100) / 100;
  const iva = Math.round(precio_inter_co * input.iva_tasa * 100) / 100;
  const ret = input.retenciones ?? 0;
  const total = Math.round((precio_inter_co + iva - ret) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    precio_inter_co,
    iva,
    retenciones: Math.round(ret * 100) / 100,
    total,
  };
}

// ----------------------------------------------------------------------------
// Catálogo de servicios
// ----------------------------------------------------------------------------

export const ServicioFormSchema = z.object({
  empresa_id: z.string().uuid("Selecciona empresa que presta el servicio"),
  codigo: z.string().trim().min(1).max(40),
  nombre: z.string().trim().min(3).max(200),
  descripcion: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  unidad: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  costo_base: z.coerce.number().nonnegative("Costo inválido"),
  margen_inter_co: z.coerce.number().min(0).max(1).default(0.15),
  precio_externo: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), {
      message: "Precio externo inválido",
    }),
  clave_sat: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  unidad_sat: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export type ServicioFormData = z.output<typeof ServicioFormSchema>;
