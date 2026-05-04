import { z } from "zod";

const ConceptoSchema = z.object({
  descripcion: z.string().trim().min(1, "Descripción requerida").max(500),
  cantidad: z.coerce.number().positive("Cantidad debe ser > 0"),
  unidad_sat: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  precio_unitario: z.coerce.number().nonnegative("Precio inválido"),
  iva_tasa: z.coerce
    .number()
    .min(0)
    .max(1, "Tasa IVA debe ser fracción 0-1, ej. 0.16"),
  clave_sat: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const OCFormSchema = z
  .object({
    empresa_id: z.string().uuid("Selecciona empresa solicitante"),
    proveedor_id: z.string().uuid("Selecciona proveedor"),
    proyecto_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    fecha_emision: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    fecha_entrega_esperada: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    condiciones_pago: z
      .string()
      .trim()
      .max(200)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    forma_pago: z
      .string()
      .trim()
      .max(60)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    comentarios: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    descuento: z.coerce.number().nonnegative().default(0),
    retenciones: z.coerce.number().nonnegative().default(0),
    conceptos: z.array(ConceptoSchema).min(1, "Agrega al menos un concepto"),
  });

export type OCFormData = z.output<typeof OCFormSchema>;

/**
 * Calcula totales desde conceptos. Round a 2 decimales en cada línea para
 * evitar arrastre de decimales.
 */
export function calcularTotalesOC(input: {
  conceptos: Array<{ cantidad: number; precio_unitario: number; iva_tasa: number }>;
  descuento?: number;
  retenciones?: number;
}) {
  const subtotal = input.conceptos.reduce(
    (acc, c) => acc + c.cantidad * c.precio_unitario,
    0,
  );
  const iva = input.conceptos.reduce(
    (acc, c) => acc + c.cantidad * c.precio_unitario * c.iva_tasa,
    0,
  );
  const descuento = input.descuento ?? 0;
  const retenciones = input.retenciones ?? 0;
  const total = subtotal - descuento + iva - retenciones;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    descuento: Math.round(descuento * 100) / 100,
    retenciones: Math.round(retenciones * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
