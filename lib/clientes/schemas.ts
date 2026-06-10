import { z } from "zod";

import {
  CURP_REGEX,
  ESTADOS_MX,
  REGIMENES_FISCALES,
  RFC_REGEX,
  USOS_CFDI,
} from "@/lib/sat/catalogos";

const codigosRegimen = REGIMENES_FISCALES.map((r) => r.codigo) as [
  string,
  ...string[],
];
const codigosUsoCFDI = USOS_CFDI.map((u) => u.codigo) as [string, ...string[]];

export const TIPOS_CLIENTE = [
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "industrial", label: "Industrial" },
  { value: "gubernamental", label: "Gubernamental" },
] as const;

export const RIESGOS = [
  { value: "bajo", label: "Bajo" },
  { value: "medio", label: "Medio" },
  { value: "alto", label: "Alto" },
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

export const ClienteFormSchema = z
  .object({
    razon_social: z
      .string()
      .trim()
      .min(2, "Razón social muy corta")
      .max(200),
    nombre_comercial: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v : null)),
    // Datos fiscales OPCIONALES en el alta: un cliente puede crearse sin
    // ellos (queda como "potencial"). Se exigen como candado al facturar.
    // Si vienen, se valida su formato.
    rfc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(RFC_REGEX, "RFC con formato inválido (12 chars moral, 13 chars física)")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    curp: z
      .string()
      .trim()
      .toUpperCase()
      .regex(CURP_REGEX, "CURP con formato inválido")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    regimen_fiscal: z
      .enum(codigosRegimen)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    cp_fiscal: z
      .string()
      .trim()
      .regex(/^\d{5}$/, "CP debe ser 5 dígitos")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    direccion_fiscal: DireccionSchema.optional(),
    email_facturacion: z
      .string()
      .trim()
      .email("Correo inválido")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    uso_cfdi_default: z.enum(codigosUsoCFDI).optional().or(z.literal("")).transform(v => v ? v : null),
    tipo: z
      .enum(["residencial", "comercial", "industrial", "gubernamental"])
      .optional()
      .or(z.literal(""))
      .transform(v => v ? v : null),
    segmento: z.string().trim().max(60).optional().or(z.literal("")).transform(v => v ? v : null),
    riesgo: z.enum(["bajo", "medio", "alto"]).default("bajo"),
    observaciones: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal(""))
      .transform(v => v ? v : null),
    /** UUIDs de las empresas del grupo que operan con este cliente */
    empresaIds: z.array(z.string().uuid()).default([]),
  })
  .superRefine((data, ctx) => {
    // Validaciones de RFC solo si se capturó (en alta express puede venir
    // vacío → cliente potencial).
    // Persona moral (12 chars) con CURP → error (CURP solo aplica a física).
    if (data.rfc && data.rfc.length === 12 && data.curp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["curp"],
        message: "CURP solo aplica a personas físicas (RFC de 13 caracteres).",
      });
    }
  });

export type ClienteFormInput = z.input<typeof ClienteFormSchema>;
export type ClienteFormData = z.output<typeof ClienteFormSchema>;
