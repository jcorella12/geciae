"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import type { GastoState } from "@/lib/gastos-recurrentes/state";
import { createClient } from "@/lib/supabase/server";

const CATEGORIAS = [
  "arrendamiento_vehiculo",
  "renta_inmueble",
  "telefonia_internet",
  "software_saas",
  "seguros",
  "vigilancia",
  "mantenimiento",
  "limpieza",
  "servicios_publicos",
  "membresia_camara",
  "asesoria_contable",
  "asesoria_legal",
  "otros_indirectos",
] as const;

const FRECUENCIAS = [
  "mensual",
  "bimestral",
  "trimestral",
  "semestral",
  "anual",
] as const;

const GastoSchema = z.object({
  empresa_id: z.string().uuid(),
  categoria: z.enum(CATEGORIAS),
  descripcion: z.string().trim().min(2).max(300),
  proveedor_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  proveedor_nombre: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  monto: z.coerce.number().nonnegative(),
  moneda: z.enum(["MXN", "USD", "EUR"]).default("MXN"),
  iva_incluido: z.coerce.boolean().default(true),
  frecuencia: z.enum(FRECUENCIAS).default("mensual"),
  dia_pago: z.coerce
    .number()
    .int()
    .min(1)
    .max(31)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : v)),
  fecha_inicio: z.string().min(10),
  fecha_fin: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  identificador: z
    .string()
    .trim()
    .max(100)
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
});

async function gateGasto(empresaId: string): Promise<boolean> {
  const v = await obtenerVinculos();
  return (
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    esRolEn(v, empresaId, ["director", "operativo"])
  );
}

export async function crearGastoRecurrente(
  _prev: GastoState,
  formData: FormData,
): Promise<GastoState> {
  const parsed = GastoSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    categoria: formData.get("categoria"),
    descripcion: formData.get("descripcion"),
    proveedor_id: formData.get("proveedor_id") || undefined,
    proveedor_nombre: formData.get("proveedor_nombre") || undefined,
    monto: formData.get("monto"),
    moneda: formData.get("moneda") || "MXN",
    iva_incluido: formData.get("iva_incluido") === "true",
    frecuencia: formData.get("frecuencia") || "mensual",
    dia_pago: formData.get("dia_pago") || undefined,
    fecha_inicio: formData.get("fecha_inicio"),
    fecha_fin: formData.get("fecha_fin") || undefined,
    identificador: formData.get("identificador") || undefined,
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
  if (!(await gateGasto(d.empresa_id))) {
    return { ok: false, id: null, error: "Sin permiso." };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gastos_recurrentes")
    .insert({
      empresa_id: d.empresa_id,
      categoria: d.categoria,
      descripcion: d.descripcion,
      proveedor_id: d.proveedor_id,
      proveedor_nombre: d.proveedor_nombre,
      monto: d.monto,
      moneda: d.moneda,
      iva_incluido: d.iva_incluido,
      frecuencia: d.frecuencia,
      dia_pago: d.dia_pago,
      fecha_inicio: d.fecha_inicio,
      fecha_fin: d.fecha_fin,
      identificador: d.identificador,
      observaciones: d.observaciones,
      activo: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, id: null, error: error.message };
  revalidatePath("/finanzas/gastos-recurrentes");
  return { ok: true, id: data.id, error: null };
}

export async function actualizarGastoRecurrente(
  gastoId: string,
  _prev: GastoState,
  formData: FormData,
): Promise<GastoState> {
  const parsed = GastoSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    categoria: formData.get("categoria"),
    descripcion: formData.get("descripcion"),
    proveedor_id: formData.get("proveedor_id") || undefined,
    proveedor_nombre: formData.get("proveedor_nombre") || undefined,
    monto: formData.get("monto"),
    moneda: formData.get("moneda") || "MXN",
    iva_incluido: formData.get("iva_incluido") === "true",
    frecuencia: formData.get("frecuencia") || "mensual",
    dia_pago: formData.get("dia_pago") || undefined,
    fecha_inicio: formData.get("fecha_inicio"),
    fecha_fin: formData.get("fecha_fin") || undefined,
    identificador: formData.get("identificador") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      id: gastoId,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  if (!(await gateGasto(d.empresa_id))) {
    return { ok: false, id: gastoId, error: "Sin permiso." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("gastos_recurrentes")
    .update({
      empresa_id: d.empresa_id,
      categoria: d.categoria,
      descripcion: d.descripcion,
      proveedor_id: d.proveedor_id,
      proveedor_nombre: d.proveedor_nombre,
      monto: d.monto,
      moneda: d.moneda,
      iva_incluido: d.iva_incluido,
      frecuencia: d.frecuencia,
      dia_pago: d.dia_pago,
      fecha_inicio: d.fecha_inicio,
      fecha_fin: d.fecha_fin,
      identificador: d.identificador,
      observaciones: d.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gastoId);
  if (error) return { ok: false, id: gastoId, error: error.message };
  revalidatePath("/finanzas/gastos-recurrentes");
  return { ok: true, id: gastoId, error: null };
}

export async function toggleActivoGasto(
  gastoId: string,
  activo: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: g } = await supabase
    .from("gastos_recurrentes")
    .select("empresa_id")
    .eq("id", gastoId)
    .maybeSingle();
  if (!g) return { ok: false, error: "No encontrado." };
  if (!(await gateGasto(g.empresa_id))) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("gastos_recurrentes")
    .update({ activo })
    .eq("id", gastoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/finanzas/gastos-recurrentes");
  return { ok: true, error: null };
}
