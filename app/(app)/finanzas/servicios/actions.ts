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
