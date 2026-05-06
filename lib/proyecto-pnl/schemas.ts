import { z } from "zod";

const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null));

export const PresupuestoSchema = z.object({
  proyecto_id: z.string().uuid(),
  ingreso_total: z.coerce.number().nonnegative(),
  presupuesto_materiales: z.coerce.number().nonnegative().default(0),
  presupuesto_mano_obra_ingenieria: z.coerce.number().nonnegative().default(0),
  presupuesto_mano_obra_campo: z.coerce.number().nonnegative().default(0),
  presupuesto_subcontratos: z.coerce.number().nonnegative().default(0),
  presupuesto_activos_compartidos: z.coerce.number().nonnegative().default(0),
  presupuesto_logistica: z.coerce.number().nonnegative().default(0),
  presupuesto_indirectos: z.coerce.number().nonnegative().default(0),
  presupuesto_otros: z.coerce.number().nonnegative().default(0),
  porcentaje_provision_garantia: z.coerce.number().min(0).max(30).default(3),
  margen_objetivo_pct: z.coerce.number().min(0).max(100).optional(),
  cotizacion_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  observaciones: optStr(2000),
});

export const CostoImputadoSchema = z.object({
  proyecto_id: z.string().uuid(),
  empresa_id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum([
    "provision_garantia",
    "ajuste_manual",
    "subcontrato_externo",
    "viaticos_no_facturados",
    "capacitacion_proyecto",
    "mejora_cliente",
    "penalizacion",
    "otro",
  ]),
  categoria: z.enum([
    "materiales",
    "mano_obra_ingenieria",
    "mano_obra_campo",
    "subcontratos",
    "activos_compartidos",
    "levantamientos",
    "logistica",
    "garantia_provision",
    "indirectos_centros",
    "otros",
  ]),
  concepto: z.string().trim().min(3).max(500),
  monto: z.coerce.number().nonnegative(),
  centro_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  comprobante_url: optStr(500),
  justificacion: z.string().trim().min(5).max(2000),
});

export const HorasIngenieriaSchema = z.object({
  proyecto_id: z.string().uuid(),
  semana_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horas: z.coerce.number().min(0).max(60),
});

export const HorasCampoSchema = z.object({
  proyecto_id: z.string().uuid(),
  semana_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cuadrilla_descripcion: z.string().trim().min(2).max(200),
  num_personas: z.coerce.number().int().positive().max(100),
  horas: z.coerce.number().min(0).max(60),
  observaciones: optStr(1000),
});
