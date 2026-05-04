import { z } from "zod";

import {
  CURP_REGEX,
  ESTADOS_MX,
  REGIMENES_FISCALES,
  RFC_REGEX,
} from "@/lib/sat/catalogos";

const codigosRegimen = REGIMENES_FISCALES.map((r) => r.codigo) as [
  string,
  ...string[],
];

export const TIPOS_PROVEEDOR = [
  { value: "materiales", label: "Materiales" },
  { value: "servicios", label: "Servicios" },
  { value: "subcontratista", label: "Subcontratista" },
  { value: "transportista", label: "Transportista" },
  { value: "otro", label: "Otro" },
] as const;

export const CLASIFICACIONES_PROVEEDOR = [
  { value: "estrategico", label: "Estratégico" },
  { value: "importante", label: "Importante" },
  { value: "recurrente", label: "Recurrente" },
  { value: "ocasional", label: "Ocasional" },
] as const;

export const SEMAFOROS = [
  {
    value: "verde",
    label: "Verde — cumple",
    description: "Documentación vigente, sin observaciones.",
  },
  {
    value: "amarillo",
    label: "Amarillo — atención",
    description: "Documentos próximos a vencer u observación menor.",
  },
  {
    value: "rojo",
    label: "Rojo — alerta",
    description: "Documentos vencidos. Bloquea creación de OC en Sprint 4.",
  },
  {
    value: "negro",
    label: "Negro — bloqueado",
    description: "En lista 69-B del SAT u otro impedimento crítico.",
  },
] as const;

const DireccionSchema = z.object({
  calle: z.string().trim().max(120).optional().or(z.literal("")),
  numero_exterior: z.string().trim().max(20).optional().or(z.literal("")),
  numero_interior: z.string().trim().max(20).optional().or(z.literal("")),
  colonia: z.string().trim().max(120).optional().or(z.literal("")),
  municipio: z.string().trim().max(120).optional().or(z.literal("")),
  estado: z.enum([...ESTADOS_MX] as [string, ...string[]]).optional(),
  pais: z.string().trim().max(60).default("México"),
});

const CuentaBancariaSchema = z.object({
  clabe: z
    .string()
    .trim()
    .regex(/^\d{18}$/, "CLABE debe ser 18 dígitos")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  banco: z.string().trim().max(60).optional().or(z.literal("")).transform(v => v ? v : null),
  titular: z.string().trim().max(120).optional().or(z.literal("")).transform(v => v ? v : null),
});

export const ProveedorFormSchema = z
  .object({
    razon_social: z.string().trim().min(2).max(200),
    nombre_comercial: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v : null)),
    rfc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(RFC_REGEX, "RFC con formato inválido"),
    curp: z
      .string()
      .trim()
      .toUpperCase()
      .regex(CURP_REGEX, "CURP con formato inválido")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    regimen_fiscal: z.enum(codigosRegimen),
    cp_fiscal: z.string().trim().regex(/^\d{5}$/, "CP debe ser 5 dígitos"),
    direccion_fiscal: DireccionSchema.optional(),
    representante_legal: z
      .string()
      .trim()
      .max(120)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    rfc_representante: z
      .string()
      .trim()
      .toUpperCase()
      .max(13)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    tipo_proveedor: z
      .enum(["materiales", "servicios", "subcontratista", "transportista", "otro"])
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    categoria_sat: z
      .string()
      .trim()
      .max(60)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    clasificacion_interna: z
      .enum(["estrategico", "importante", "recurrente", "ocasional"])
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    requiere_repse: z.coerce.boolean().default(false),
    cuenta_bancaria: CuentaBancariaSchema.optional(),
    semaforo: z.enum(["verde", "amarillo", "rojo", "negro"]).default("verde"),
    esta_aprobado: z.coerce.boolean().default(false),
    fecha_aprobacion: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)")
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
    empresaIds: z.array(z.string().uuid()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.rfc.length === 12 && data.curp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["curp"],
        message: "CURP solo aplica a personas físicas (RFC de 13 caracteres).",
      });
    }
    if (data.esta_aprobado && !data.fecha_aprobacion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fecha_aprobacion"],
        message: "Captura la fecha de aprobación.",
      });
    }
  });

export type ProveedorFormData = z.output<typeof ProveedorFormSchema>;
