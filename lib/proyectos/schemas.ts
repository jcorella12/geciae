import { z } from "zod";

const ESTADOS = [
  "cotizacion",
  "contrato_firmado",
  "planeacion",
  "en_ejecucion",
  "en_cierre",
  "entregado",
  "en_om",
  "cerrado",
  "cancelado",
] as const;

export const ProyectoFormSchema = z.object({
  empresa_id: z.string().uuid("Selecciona empresa"),
  cliente_id: z.string().uuid("Selecciona cliente"),
  codigo: z.string().trim().min(1, "Código requerido").max(40),
  nombre: z.string().trim().min(3, "Nombre muy corto").max(200),
  descripcion: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  tipo: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  estado: z.enum(ESTADOS).default("cotizacion"),
  fecha_contrato: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_inicio_planeado: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_fin_planeado: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  monto_contratado: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), {
      message: "Monto inválido",
    }),
  presupuesto_costo: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), {
      message: "Presupuesto inválido",
    }),
  capacidad_kwp: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), {
      message: "Capacidad inválida",
    }),
  observaciones: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  marca_visible_id: z
    .string()
    .uuid("Marca inválida")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  uniforme_marca: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export type ProyectoFormData = z.output<typeof ProyectoFormSchema>;
