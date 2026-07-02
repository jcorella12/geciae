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
    // Modo de captura. "rapido" (default): adjunto + total directo + una
    // descripción general → genera 1 concepto sintético. "detallado": el
    // usuario captura cada concepto a mano.
    modo: z.enum(["rapido", "detallado"]).default("rapido"),
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
    centro_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),

    // --- Contraloría (opcionales; flujo del contralor) ---
    // Empresa que PAGA si difiere de la solicitante (operación inter-empresa).
    empresa_pagadora_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    tipo_compra: z
      .enum(["gasto", "obra", "material", "activo", "servicio", "anticipo", "otro"])
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    // Clave del catálogo contable (se resuelve a cuenta_contable_id en la action).
    cuenta_clave: z
      .string()
      .trim()
      .max(30)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    urgencia: z
      .enum(["cero", "bajo", "medio", "alto", "critica"])
      .default("cero"),

    // --- Modo rápido ---
    // Descripción general de qué se compra (es el concepto sintético, y la
    // explicación obligatoria cuando no hay documento adjunto).
    descripcion_general: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    // Total tal cual se pagará (lo que viene en la cotización/factura).
    total_directo: z.coerce.number().nonnegative().optional(),
    // ¿El total ya incluye IVA 16%? (lo común). Si sí, se desglosa.
    iva_incluido: z.coerce.boolean().default(true),

    // --- Modo detallado ---
    // En modo rápido puede venir vacío; el concepto sintético se arma en la
    // server action a partir de descripcion_general + total_directo.
    conceptos: z.array(ConceptoSchema).default([]),
  })
  .superRefine((d, ctx) => {
    if (d.modo === "detallado") {
      if (!d.conceptos || d.conceptos.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["conceptos"],
          message: "Agrega al menos un concepto.",
        });
      }
    } else {
      // rápido
      if (!d.descripcion_general) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["descripcion_general"],
          message: "Describe qué se compra.",
        });
      }
      if (!d.total_directo || d.total_directo <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["total_directo"],
          message: "Captura el total de la compra.",
        });
      }
    }
  });

export type OCFormData = z.output<typeof OCFormSchema>;

const TASA_IVA = 0.16;

/**
 * Construye los conceptos efectivos de la OC según el modo.
 * - detallado: usa los conceptos capturados tal cual.
 * - rápido: genera 1 concepto sintético a partir de descripcion_general +
 *   total_directo. Si iva_incluido, desglosa el IVA 16% (subtotal = total/1.16);
 *   si no, el total es el subtotal sin impuestos.
 */
export function conceptosEfectivos(d: OCFormData): Array<{
  descripcion: string;
  cantidad: number;
  unidad_sat: string | null;
  precio_unitario: number;
  iva_tasa: number;
  clave_sat: string | null;
}> {
  if (d.modo === "detallado") {
    return d.conceptos;
  }
  const total = d.total_directo ?? 0;
  const subtotal = d.iva_incluido
    ? Math.round((total / (1 + TASA_IVA)) * 100) / 100
    : total;
  return [
    {
      descripcion: d.descripcion_general ?? "Compra según documento adjunto",
      cantidad: 1,
      unidad_sat: null,
      precio_unitario: subtotal,
      iva_tasa: d.iva_incluido ? TASA_IVA : 0,
      clave_sat: null,
    },
  ];
}

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
