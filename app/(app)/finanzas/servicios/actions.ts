"use server";

import { revalidatePath } from "next/cache";

import { obtenerVinculos, puedeCrearOCEn } from "@/lib/auth/permisos";
import { ServicioFormSchema } from "@/lib/ot/schemas";
import type { ServicioState } from "@/lib/ot/state";
import { createClient } from "@/lib/supabase/server";

function parseFormData(formData: FormData) {
  return {
    empresa_id: formData.get("empresa_id"),
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    unidad: formData.get("unidad") || undefined,
    costo_base: formData.get("costo_base"),
    margen_inter_co: formData.get("margen_inter_co") || 0.15,
    precio_externo: formData.get("precio_externo") || undefined,
    clave_sat: formData.get("clave_sat") || undefined,
    unidad_sat: formData.get("unidad_sat") || undefined,
  };
}

export async function crearServicio(
  _prev: ServicioState,
  formData: FormData,
): Promise<ServicioState> {
  const parsed = ServicioFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const v = await obtenerVinculos();
  if (!puedeCrearOCEn(v, d.empresa_id)) {
    return {
      ok: false,
      error: "Sin permiso para gestionar servicios de esta empresa.",
    };
  }
  const supabase = createClient();
  const precio_inter_co =
    Math.round(d.costo_base * (1 + d.margen_inter_co) * 100) / 100;

  const { error } = await supabase.from("catalogo_servicios").insert({
    empresa_id: d.empresa_id,
    codigo: d.codigo,
    nombre: d.nombre,
    descripcion: d.descripcion,
    unidad: d.unidad,
    costo_base: d.costo_base,
    margen_inter_co: d.margen_inter_co,
    precio_inter_co,
    precio_externo: d.precio_externo,
    clave_sat: d.clave_sat,
    unidad_sat: d.unidad_sat,
    iva_aplicable: true,
    activo: true,
  });
  if (error) {
    return {
      ok: false,
      error: error.message?.includes("duplicate")
        ? "Ya existe un servicio con ese código en esta empresa."
        : `Error: ${error.message}`,
    };
  }
  revalidatePath("/finanzas/servicios");
  return { ok: true, error: null };
}

/**
 * Quick Create — crea un servicio mínimo y devuelve la fila completa.
 *
 * Usado por QuickCreatePicker en formularios padres (p.ej. OT inter-co)
 * para que la nueva entidad pueda quedar seleccionada inmediatamente.
 *
 * No se invoca con FormData; se llama directo desde Client con args tipados.
 */
export async function crearServicioRapido(input: {
  empresa_id: string;
  codigo: string;
  nombre: string;
  unidad?: string | null;
  costo_base: number;
  margen_inter_co?: number;
}): Promise<{
  ok: boolean;
  error: string | null;
  servicio?: {
    id: string;
    empresa_id: string;
    codigo: string;
    nombre: string;
    unidad: string | null;
    costo_base: number | null;
    margen_inter_co: number | null;
    precio_inter_co: number | null;
  };
}> {
  const v = await obtenerVinculos();
  if (!puedeCrearOCEn(v, input.empresa_id)) {
    return {
      ok: false,
      error: "Sin permiso para gestionar servicios de esta empresa.",
    };
  }
  if (!input.codigo?.trim() || !input.nombre?.trim()) {
    return { ok: false, error: "Código y nombre son requeridos." };
  }
  if (!Number.isFinite(input.costo_base) || input.costo_base < 0) {
    return { ok: false, error: "Costo base inválido." };
  }
  const margen = input.margen_inter_co ?? 0.15;
  const precio_inter_co =
    Math.round(input.costo_base * (1 + margen) * 100) / 100;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("catalogo_servicios")
    .insert({
      empresa_id: input.empresa_id,
      codigo: input.codigo.trim(),
      nombre: input.nombre.trim(),
      unidad: input.unidad?.trim() || null,
      costo_base: input.costo_base,
      margen_inter_co: margen,
      precio_inter_co,
      iva_aplicable: true,
      activo: true,
    })
    .select(
      "id, empresa_id, codigo, nombre, unidad, costo_base, margen_inter_co, precio_inter_co",
    )
    .single();
  if (error || !data) {
    return {
      ok: false,
      error: error?.message?.includes("duplicate")
        ? "Ya existe un servicio con ese código en esta empresa."
        : `Error: ${error?.message ?? "no se pudo crear"}`,
    };
  }
  revalidatePath("/finanzas/servicios");
  return {
    ok: true,
    error: null,
    servicio: {
      id: data.id,
      empresa_id: data.empresa_id,
      codigo: data.codigo,
      nombre: data.nombre,
      unidad: data.unidad,
      costo_base: data.costo_base != null ? Number(data.costo_base) : null,
      margen_inter_co:
        data.margen_inter_co != null ? Number(data.margen_inter_co) : null,
      precio_inter_co:
        data.precio_inter_co != null ? Number(data.precio_inter_co) : null,
    },
  };
}

export async function toggleServicioActivo(
  servicioId: string,
  proximo: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const v = await obtenerVinculos();
  const supabase = createClient();
  const { data: s } = await supabase
    .from("catalogo_servicios")
    .select("empresa_id")
    .eq("id", servicioId)
    .maybeSingle();
  if (!s) return { ok: false, error: "Servicio no encontrado." };
  if (!puedeCrearOCEn(v, s.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("catalogo_servicios")
    .update({ activo: proximo })
    .eq("id", servicioId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/finanzas/servicios");
  return { ok: true, error: null };
}
