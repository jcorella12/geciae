import { z } from "zod";

import {
  METODOS_REPARTO,
  SUBTIPOS_CENTRO,
  TIPOS_CENTRO,
  TIPOS_EMISION_REPARTO,
} from "./state";

const idCentro = z.string().uuid("Centro inválido");
const idEmpresa = z.string().uuid("Empresa inválida");

// ============================================================================
// Centros
// ============================================================================

export const CrearCentroSchema = z
  .object({
    empresa_id: idEmpresa,
    codigo: z
      .string()
      .trim()
      .min(2, "Código muy corto")
      .max(32, "Código muy largo")
      .regex(
        /^[A-Z0-9_-]+$/i,
        "Solo letras, números, guion y guion bajo",
      ),
    nombre: z.string().trim().min(3, "Nombre muy corto").max(120),
    descripcion: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    tipo: z.enum(TIPOS_CENTRO as [string, ...string[]]),
    subtipo: z.enum(SUBTIPOS_CENTRO as [string, ...string[]]),
    responsable_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null))
      .nullable(),
    centro_padre_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null))
      .nullable(),
    presupuesto_anual: z
      .coerce.number()
      .nonnegative("El presupuesto no puede ser negativo")
      .optional()
      .nullable(),
    observaciones: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
  })
  .superRefine((data, ctx) => {
    // Validación de coherencia tipo↔subtipo
    if (data.subtipo === "servicio_compartido" && data.tipo !== "costo") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipo"],
        message: "Servicio compartido debe ser tipo 'costo'.",
      });
    }
    if (
      ["comercial", "mantenimiento", "capacitacion", "certificacion"].includes(
        data.subtipo,
      ) &&
      data.tipo !== "utilidad"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipo"],
        message: `Subtipo '${data.subtipo}' debe ser tipo 'utilidad'.`,
      });
    }
  });

export const ActualizarCentroSchema = z.object({
  centro_id: idCentro,
  nombre: z.string().trim().min(3).max(120).optional(),
  descripcion: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable(),
  responsable_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null))
    .nullable(),
  presupuesto_anual: z.coerce.number().nonnegative().optional().nullable(),
  observaciones: z.string().trim().max(2000).optional().nullable(),
});

export const ArchivarCentroSchema = z.object({
  centro_id: idCentro,
});

// ============================================================================
// Reglas de reparto
// ============================================================================

export const CrearReglaRepartoSchema = z
  .object({
    centro_origen_id: idCentro,
    empresa_destino_id: idEmpresa,
    centro_destino_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null))
      .nullable(),
    metodo: z.enum(METODOS_REPARTO as [string, ...string[]]),
    valor: z.coerce.number().optional().nullable(),
    emision: z.enum(TIPOS_EMISION_REPARTO as [string, ...string[]]).default(
      "asiento_interno",
    ),
    vigencia_desde: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha desde inválida"),
    vigencia_hasta: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha hasta inválida")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null))
      .nullable(),
    observaciones: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
  })
  .superRefine((data, ctx) => {
    if (data.metodo === "porcentaje_fijo") {
      if (data.valor === undefined || data.valor === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["valor"],
          message: "El porcentaje fijo requiere un valor.",
        });
      } else if (data.valor <= 0 || data.valor > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["valor"],
          message: "Porcentaje debe estar entre 0 (excluido) y 100.",
        });
      }
    }
    if (
      data.vigencia_hasta !== null &&
      data.vigencia_hasta < data.vigencia_desde
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vigencia_hasta"],
        message: "La fecha hasta debe ser posterior o igual a la desde.",
      });
    }
  });

export const ActualizarReglaRepartoSchema = z.object({
  regla_id: z.string().uuid(),
  metodo: z.enum(METODOS_REPARTO as [string, ...string[]]).optional(),
  valor: z.coerce.number().optional().nullable(),
  emision: z.enum(TIPOS_EMISION_REPARTO as [string, ...string[]]).optional(),
  vigencia_hasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  observaciones: z.string().trim().max(2000).optional().nullable(),
});

export const ArchivarReglaSchema = z.object({
  regla_id: z.string().uuid(),
});

// ============================================================================
// Movimientos manuales
// ============================================================================

export const CrearMovimientoSchema = z.object({
  centro_id: idCentro,
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  tipo: z.enum([
    "gasto_directo",
    "reparto_recibido",
    "ingreso_directo",
    "ajuste",
    "cierre_mensual",
    "reparto_emitido",
  ] as [string, ...string[]]),
  concepto: z.string().trim().min(3).max(500),
  monto: z.coerce.number().nonnegative("Monto no puede ser negativo"),
  proyecto_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null))
    .nullable(),
  observaciones: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

// ============================================================================
// Cierres mensuales
// ============================================================================

export const CerrarMesSchema = z.object({
  empresa_id: idEmpresa,
  anio: z.coerce.number().int().min(2020).max(2099),
  mes: z.coerce.number().int().min(1).max(12),
  observaciones: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const ReabrirMesSchema = z.object({
  empresa_id: idEmpresa,
  anio: z.coerce.number().int().min(2020).max(2099),
  mes: z.coerce.number().int().min(1).max(12),
  motivo: z
    .string()
    .trim()
    .min(10, "El motivo de re-apertura debe ser claro (mínimo 10 chars)")
    .max(2000),
});
