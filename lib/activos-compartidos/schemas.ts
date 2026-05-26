import { z } from "zod";

const TIPOS = [
  "medicion",
  "elevacion",
  "perforacion",
  "energia",
  "transporte",
  "taller",
  "oficina",
  "otro",
] as const;

const ESTADOS = [
  "disponible",
  "en_uso",
  "en_mantenimiento",
  "en_calibracion",
  "fuera_servicio",
  "baja",
] as const;

const UNIDADES = ["hora", "dia", "ciclo", "kilometro"] as const;

const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null));

const optDate = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

// Number opcional: el form HTML manda "" cuando el campo está vacío y
// z.coerce.number() lo convierte a 0, lo cual falla validaciones como
// .min(1950). Usamos preprocess para colapsar "" / null a undefined ANTES
// de aplicar el validador, así .optional() funciona correctamente.
const optNum = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    schema.optional(),
  );

export const CrearActivoSchema = z.object({
  codigo: z.string().trim().min(2).max(40).transform((v) => v.toUpperCase()),
  nombre: z.string().trim().min(2).max(200),
  descripcion: optStr(2000),
  tipo: z.enum(TIPOS),
  marca: optStr(100),
  modelo: optStr(100),
  numero_serie: optStr(100),
  anio_fabricacion: optNum(z.coerce.number().int().min(1950).max(2100)),
  capacidad: optStr(100),
  empresa_propietaria_id: z.string().uuid(),
  fecha_adquisicion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  costo_adquisicion: z.coerce.number().nonnegative(),
  proveedor_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  vida_util_anios: z.coerce.number().int().min(1).max(50).default(8),
  valor_residual_pct: z.coerce.number().min(0).max(100).default(10),
  unidad_uso: z.enum(UNIDADES).default("hora"),
  uso_estimado_anual: z.coerce.number().positive().default(200),
  margen_administracion_pct: z.coerce.number().min(0).max(100).default(12),
  tarifa_manual: optNum(z.coerce.number().nonnegative()),
  estado: z.enum(ESTADOS).default("disponible"),
  ubicacion_actual_empresa_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  ubicacion_actual_descripcion: optStr(500),
  requiere_calibracion: z.coerce.boolean().default(false),
  frecuencia_calibracion_meses: optNum(z.coerce.number().int().positive()),
  fecha_ultima_calibracion: optDate,
  laboratorio_calibracion: optStr(200),
  requiere_mantenimiento_preventivo: z.coerce.boolean().default(true),
  frecuencia_mantenimiento_meses: z.coerce.number().int().positive().default(6),
  fecha_ultimo_mantenimiento: optDate,
  numero_poliza_seguro: optStr(100),
  vigencia_seguro_hasta: optDate,
  costo_anual_seguro: optNum(z.coerce.number().nonnegative()),
  observaciones: optStr(2000),
});

export type CrearActivoData = z.output<typeof CrearActivoSchema>;

export const ActualizarActivoSchema = CrearActivoSchema.partial().extend({
  id: z.string().uuid(),
});

export const AgregarCostoAnualSchema = z.object({
  activo_id: z.string().uuid(),
  anio: z.coerce.number().int().min(2020).max(2100),
  depreciacion: optNum(z.coerce.number().nonnegative()),
  mantenimiento: z.coerce.number().nonnegative().default(0),
  calibraciones: z.coerce.number().nonnegative().default(0),
  seguro: z.coerce.number().nonnegative().default(0),
  refacciones: z.coerce.number().nonnegative().default(0),
  otros: z.coerce.number().nonnegative().default(0),
  observaciones: optStr(1000),
});

export const RegistrarMantenimientoSchema = z.object({
  activo_id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monto: optNum(z.coerce.number().nonnegative()),
  observaciones: optStr(2000),
});

export const RegistrarCalibracionSchema = z.object({
  activo_id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monto: optNum(z.coerce.number().nonnegative()),
  laboratorio: optStr(200),
  observaciones: optStr(2000),
});

export const AgregarDocumentoSchema = z.object({
  activo_id: z.string().uuid(),
  tipo_documento: z.string().trim().min(2).max(100),
  nombre: z.string().trim().min(2).max(200),
  url: z.string().min(1).max(500),
  fecha_documento: optDate,
  vencimiento: optDate,
  observaciones: optStr(1000),
});
