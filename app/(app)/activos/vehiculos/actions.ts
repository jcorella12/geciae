"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import type {
  BitacoraState,
  VehiculoState,
} from "@/lib/vehiculos/state";

const ESTATUS = [
  "activo",
  "mantenimiento",
  "reparacion",
  "fuera_servicio",
  "baja",
] as const;

const PROPIEDADES = [
  "propio",
  "arrendamiento_financiero",
  "arrendamiento_puro",
  "rentado_corto_plazo",
  "comodato",
] as const;

const TIPOS_EVENTO = [
  "carga_combustible",
  "lectura_km",
  "mantenimiento_preventivo",
  "mantenimiento_correctivo",
  "reparacion",
  "verificacion",
  "tenencia",
  "siniestro",
  "multa",
  "lavado",
  "otros",
] as const;

const VehiculoSchema = z.object({
  empresa_id: z.string().uuid(),
  placa: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v.toUpperCase() : null)),
  numero_economico: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  serie: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  marca: z.string().trim().min(2).max(100),
  modelo: z.string().trim().min(1).max(100),
  // Form HTML manda "" cuando está vacío; z.coerce.number() lo vuelve 0 y
  // 0 < 1980 falla. preprocess colapsa "" → undefined antes del coerce.
  anio: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(1980).max(2100).optional(),
  ),
  color: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  tipo: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  uso: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  combustible: z
    .string()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  tipo_propiedad: z.enum(PROPIEDADES).default("propio"),
  fecha_adquisicion: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  costo_adquisicion: z.coerce.number().nonnegative().optional(),
  proveedor_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  gasto_recurrente_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_termino_contrato: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  estatus: z.enum(ESTATUS).default("activo"),
  km_actual: z.coerce.number().int().nonnegative().optional(),
  poliza_seguro: z
    .string()
    .max(100)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_vencimiento_seguro: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  asignado_a: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  empleado_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  observaciones: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

const BitacoraSchema = z.object({
  vehiculo_id: z.string().uuid(),
  fecha: z.string().min(10),
  tipo: z.enum(TIPOS_EVENTO),
  descripcion: z.string().trim().min(2).max(500),
  litros: z.coerce.number().nonnegative().optional(),
  precio_por_litro: z.coerce.number().nonnegative().optional(),
  monto: z.coerce.number().nonnegative().optional(),
  iva: z.coerce.number().nonnegative().optional(),
  proveedor_nombre: z
    .string()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  km_lectura: z.coerce.number().int().nonnegative().optional(),
  empleado_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  observaciones: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

async function gateVehiculo(empresaId: string): Promise<boolean> {
  const v = await obtenerVinculos();
  return esCEO(v) || esRolEn(v, empresaId, ["director", "operativo"]);
}

export async function crearVehiculo(
  _prev: VehiculoState,
  formData: FormData,
): Promise<VehiculoState> {
  const parsed = VehiculoSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    placa: formData.get("placa") || undefined,
    numero_economico: formData.get("numero_economico") || undefined,
    serie: formData.get("serie") || undefined,
    marca: formData.get("marca"),
    modelo: formData.get("modelo"),
    anio: formData.get("anio") || undefined,
    color: formData.get("color") || undefined,
    tipo: formData.get("tipo") || undefined,
    uso: formData.get("uso") || undefined,
    combustible: formData.get("combustible") || undefined,
    tipo_propiedad: formData.get("tipo_propiedad") || "propio",
    fecha_adquisicion: formData.get("fecha_adquisicion") || undefined,
    costo_adquisicion: formData.get("costo_adquisicion") || undefined,
    proveedor_id: formData.get("proveedor_id") || undefined,
    gasto_recurrente_id: formData.get("gasto_recurrente_id") || undefined,
    fecha_termino_contrato: formData.get("fecha_termino_contrato") || undefined,
    estatus: formData.get("estatus") || "activo",
    km_actual: formData.get("km_actual") || undefined,
    poliza_seguro: formData.get("poliza_seguro") || undefined,
    fecha_vencimiento_seguro:
      formData.get("fecha_vencimiento_seguro") || undefined,
    asignado_a: formData.get("asignado_a") || undefined,
    empleado_id: formData.get("empleado_id") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      id: null,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  if (!(await gateVehiculo(d.empresa_id))) {
    return { ok: false, id: null, error: "Sin permiso." };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehiculos")
    .insert({
      empresa_id: d.empresa_id,
      placa: d.placa,
      numero_economico: d.numero_economico,
      serie: d.serie,
      marca: d.marca,
      modelo: d.modelo,
      anio: d.anio,
      color: d.color,
      tipo: d.tipo,
      uso: d.uso,
      combustible: d.combustible,
      tipo_propiedad: d.tipo_propiedad,
      fecha_adquisicion: d.fecha_adquisicion,
      costo_adquisicion: d.costo_adquisicion,
      proveedor_id: d.proveedor_id,
      gasto_recurrente_id: d.gasto_recurrente_id,
      fecha_termino_contrato: d.fecha_termino_contrato,
      estatus: d.estatus,
      km_actual: d.km_actual ?? 0,
      poliza_seguro: d.poliza_seguro,
      fecha_vencimiento_seguro: d.fecha_vencimiento_seguro,
      asignado_a: d.asignado_a,
      empleado_id: d.empleado_id,
      observaciones: d.observaciones,
    } as never)
    .select("id")
    .single();
  if (error) return { ok: false, id: null, error: error.message };
  revalidatePath("/activos/vehiculos");
  return { ok: true, id: data.id, error: null };
}

export async function actualizarVehiculo(
  vehiculoId: string,
  _prev: VehiculoState,
  formData: FormData,
): Promise<VehiculoState> {
  const parsed = VehiculoSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    placa: formData.get("placa") || undefined,
    numero_economico: formData.get("numero_economico") || undefined,
    serie: formData.get("serie") || undefined,
    marca: formData.get("marca"),
    modelo: formData.get("modelo"),
    anio: formData.get("anio") || undefined,
    color: formData.get("color") || undefined,
    tipo: formData.get("tipo") || undefined,
    uso: formData.get("uso") || undefined,
    combustible: formData.get("combustible") || undefined,
    tipo_propiedad: formData.get("tipo_propiedad") || "propio",
    fecha_adquisicion: formData.get("fecha_adquisicion") || undefined,
    costo_adquisicion: formData.get("costo_adquisicion") || undefined,
    proveedor_id: formData.get("proveedor_id") || undefined,
    gasto_recurrente_id: formData.get("gasto_recurrente_id") || undefined,
    fecha_termino_contrato: formData.get("fecha_termino_contrato") || undefined,
    estatus: formData.get("estatus") || "activo",
    km_actual: formData.get("km_actual") || undefined,
    poliza_seguro: formData.get("poliza_seguro") || undefined,
    fecha_vencimiento_seguro:
      formData.get("fecha_vencimiento_seguro") || undefined,
    asignado_a: formData.get("asignado_a") || undefined,
    empleado_id: formData.get("empleado_id") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      id: vehiculoId,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  if (!(await gateVehiculo(d.empresa_id))) {
    return { ok: false, id: vehiculoId, error: "Sin permiso." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("vehiculos")
    .update({
      ...d,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", vehiculoId);
  if (error) return { ok: false, id: vehiculoId, error: error.message };
  revalidatePath("/activos/vehiculos");
  revalidatePath(`/activos/vehiculos/${vehiculoId}`);
  return { ok: true, id: vehiculoId, error: null };
}

export async function registrarBitacora(
  _prev: BitacoraState,
  formData: FormData,
): Promise<BitacoraState> {
  const parsed = BitacoraSchema.safeParse({
    vehiculo_id: formData.get("vehiculo_id"),
    fecha: formData.get("fecha"),
    tipo: formData.get("tipo"),
    descripcion: formData.get("descripcion"),
    litros: formData.get("litros") || undefined,
    precio_por_litro: formData.get("precio_por_litro") || undefined,
    monto: formData.get("monto") || undefined,
    iva: formData.get("iva") || undefined,
    proveedor_nombre: formData.get("proveedor_nombre") || undefined,
    km_lectura: formData.get("km_lectura") || undefined,
    empleado_id: formData.get("empleado_id") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  // Si no se especificó empleado pero el vehículo tiene asignado uno,
  // hereda automáticamente del vehículo (caso típico: el responsable es el
  // que carga gasolina).
  let empleadoFinal = d.empleado_id;
  if (!empleadoFinal) {
    const { data: vh } = (await supabase
      .from("vehiculos")
      .select("empleado_id" as never)
      .eq("id", d.vehiculo_id)
      .maybeSingle()) as unknown as {
      data: { empleado_id: string | null } | null;
    };
    empleadoFinal = vh?.empleado_id ?? null;
  }

  const { error } = await supabase.from("vehiculos_bitacora").insert({
    vehiculo_id: d.vehiculo_id,
    fecha: d.fecha,
    tipo: d.tipo,
    descripcion: d.descripcion,
    litros: d.litros,
    precio_por_litro: d.precio_por_litro,
    monto: d.monto,
    iva: d.iva,
    proveedor_nombre: d.proveedor_nombre,
    km_lectura: d.km_lectura,
    empleado_id: empleadoFinal,
    observaciones: d.observaciones,
    capturado_por: user.id,
  } as never);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/activos/vehiculos/${d.vehiculo_id}`);
  return { ok: true, error: null };
}
