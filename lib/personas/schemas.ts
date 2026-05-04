import { z } from "zod";

export const VacacionSchema = z
  .object({
    empleado_id: z.string().uuid(),
    tipo: z.enum([
      "vacaciones",
      "permiso_con_goce",
      "permiso_sin_goce",
      "incapacidad",
    ]),
    fecha_inicio: z.string().min(10),
    fecha_fin: z.string().min(10),
    motivo: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
  })
  .refine((d) => new Date(d.fecha_fin) >= new Date(d.fecha_inicio), {
    message: "La fecha fin debe ser igual o posterior al inicio.",
    path: ["fecha_fin"],
  });

export const ViaticoSchema = z.object({
  empleado_id: z.string().uuid(),
  empresa_id: z.string().uuid(),
  proyecto_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_gasto: z.string().min(10),
  concepto: z.string().trim().min(3).max(200),
  categoria: z.enum([
    "hospedaje",
    "alimentos",
    "transporte",
    "combustible",
    "peajes",
    "estacionamiento",
    "papeleria",
    "telefono",
    "otros",
  ]),
  monto: z.coerce.number().positive(),
  observaciones: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const DocumentoEmpleadoSchema = z.object({
  empleado_id: z.string().uuid(),
  tipo: z.enum([
    "ine",
    "curp",
    "csf",
    "acta_nacimiento",
    "comprobante_domicilio",
    "rfc_homoclave",
    "nss",
    "contrato",
    "alta_imss",
    "examen_medico",
    "capacitacion_repse",
    "constancia_repse",
    "otro",
  ]),
  fecha_emision: z
    .string()
    .min(10)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_vencimiento: z
    .string()
    .min(10)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  observaciones: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});
