import { z } from "zod";

import { CURP_REGEX, ESTADOS_MX, RFC_REGEX } from "@/lib/cfdi/catalogos-sat";

export const CATEGORIAS_PERSONAL = [
  {
    value: "planta",
    label: "Planta",
    description: "Empleado de planta con contrato indeterminado e IMSS.",
  },
  {
    value: "por_obra",
    label: "Por obra",
    description: "Contrato por obra determinada (proyecto específico).",
  },
  {
    value: "repse",
    label: "REPSE",
    description: "Personal subcontratado bajo padrón REPSE.",
  },
] as const;

export const GENEROS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "X", label: "No binario / Otro" },
] as const;

export const ESTADOS_CIVILES = [
  { value: "soltero", label: "Soltero/a" },
  { value: "casado", label: "Casado/a" },
  { value: "union_libre", label: "Unión libre" },
  { value: "divorciado", label: "Divorciado/a" },
  { value: "viudo", label: "Viudo/a" },
] as const;

const DomicilioSchema = z.object({
  calle: z.string().trim().max(120).optional().or(z.literal("")),
  numero_exterior: z.string().trim().max(20).optional().or(z.literal("")),
  numero_interior: z.string().trim().max(20).optional().or(z.literal("")),
  colonia: z.string().trim().max(120).optional().or(z.literal("")),
  municipio: z.string().trim().max(120).optional().or(z.literal("")),
  estado: z.enum([...ESTADOS_MX] as [string, ...string[]]).optional(),
  cp: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "CP debe ser 5 dígitos")
    .optional()
    .or(z.literal("")),
});

const ContactoEmergenciaSchema = z.object({
  nombre: z.string().trim().max(120).optional().or(z.literal("")),
  relacion: z.string().trim().max(60).optional().or(z.literal("")),
  telefono: z.string().trim().max(20).optional().or(z.literal("")),
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
});

export const EmpleadoFormSchema = z
  .object({
    empresa_id: z.string().uuid("Selecciona la empresa contratante"),
    nombre_completo: z.string().trim().min(3).max(200),
    curp: z
      .string()
      .trim()
      .toUpperCase()
      .regex(CURP_REGEX, "CURP con formato inválido"),
    rfc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(RFC_REGEX, "RFC con formato inválido")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    nss: z
      .string()
      .trim()
      .regex(/^\d{11}$/, "NSS debe ser 11 dígitos")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    fecha_nacimiento: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    genero: z
      .enum(["M", "F", "X"])
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    estado_civil: z
      .enum(["soltero", "casado", "union_libre", "divorciado", "viudo"])
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    email_personal: z
      .string()
      .trim()
      .email("Correo inválido")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    telefono: z
      .string()
      .trim()
      .max(20)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    whatsapp: z
      .string()
      .trim()
      .max(20)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    domicilio: DomicilioSchema.optional(),
    contacto_emergencia: ContactoEmergenciaSchema.optional(),
    numero_empleado: z.string().trim().min(1).max(40),
    categoria: z.enum(["planta", "por_obra", "repse"]),
    puesto: z.string().trim().min(1).max(120),
    area: z
      .string()
      .trim()
      .max(120)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    jefe_directo_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    fecha_ingreso: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
    cuenta_bancaria: CuentaBancariaSchema.optional(),
    salario_base: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), {
        message: "Salario inválido",
      }),
    observaciones: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
  });

export type EmpleadoFormData = z.output<typeof EmpleadoFormSchema>;
