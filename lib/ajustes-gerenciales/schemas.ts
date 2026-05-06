/**
 * Sprint S — Schemas Zod para validar inputs del módulo de ajustes gerenciales.
 */

import { z } from "zod";

const TIPO_ENUM = z.enum([
  "inventario_gastado_existente",
  "construccion_remodelacion_oficina",
  "equipo_herramienta_gastado",
  "prestamo_personal_negocio",
  "aportacion_no_formalizada",
]);

const CONTRAPARTE_ENUM = z.enum(["fundador", "socio", "familiar", "tercero"]);

const TIPO_DOC_ENUM = z.enum([
  "factura_origen",
  "foto_activo",
  "pagare",
  "evidencia_aportacion",
  "avaluo",
  "otro",
]);

const FECHA_ISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

export const CrearAjusteSchema = z.object({
  empresa_id: z.string().uuid(),
  tipo: TIPO_ENUM,
  descripcion: z.string().min(5, "Descripción demasiado corta").max(500),
  valor: z.number().positive("Valor debe ser positivo"),
  fecha_adquisicion: FECHA_ISO,
  vida_util_anios: z.number().int().positive().max(50).nullable().optional(),
  valor_residual_pct: z.number().min(0).max(100).default(10),
  justificacion: z
    .string()
    .min(20, "Justificación obligatoria, mínimo 20 caracteres")
    .max(2000),
  oc_origen_id: z.string().uuid().nullable().optional(),
  cfdi_origen_id: z.string().uuid().nullable().optional(),
  observaciones_origen: z.string().max(500).nullable().optional(),
  contraparte_nombre: z.string().max(200).nullable().optional(),
  contraparte_relacion: CONTRAPARTE_ENUM.nullable().optional(),
  observaciones: z.string().max(1000).nullable().optional(),
});

export type CrearAjusteInput = z.infer<typeof CrearAjusteSchema>;

export const ActualizarAjusteSchema = CrearAjusteSchema.partial().extend({
  id: z.string().uuid(),
  motivo_cambio: z.string().min(20, "Justificación del cambio obligatoria"),
});

export type ActualizarAjusteInput = z.infer<typeof ActualizarAjusteSchema>;

export const CancelarAjusteSchema = z.object({
  id: z.string().uuid(),
  motivo: z.string().min(20, "Motivo obligatorio"),
});

export const RegularizarAjusteSchema = z.object({
  id: z.string().uuid(),
  fecha_regularizacion: FECHA_ISO,
  observaciones: z.string().min(20),
});

export const AgregarDocumentoSchema = z.object({
  ajuste_id: z.string().uuid(),
  tipo_documento: TIPO_DOC_ENUM,
  nombre: z.string().min(3).max(200),
  fecha_documento: FECHA_ISO.nullable().optional(),
  observaciones: z.string().max(500).nullable().optional(),
});

export const CambiarEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(["borrador", "vigente"]),
});
