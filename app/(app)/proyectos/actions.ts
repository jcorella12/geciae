"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  obtenerVinculos,
  puedeGestionarProyectosEn,
} from "@/lib/auth/permisos";
import { ProyectoFormSchema } from "@/lib/proyectos/schemas";
import type { ProyectoState } from "@/lib/proyectos/state";
import { createClient } from "@/lib/supabase/server";

function parseFormData(formData: FormData) {
  return {
    empresa_id: formData.get("empresa_id"),
    cliente_id: formData.get("cliente_id"),
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    tipo: formData.get("tipo") || undefined,
    estado: formData.get("estado") || "cotizacion",
    fecha_contrato: formData.get("fecha_contrato") || undefined,
    fecha_inicio_planeado: formData.get("fecha_inicio_planeado") || undefined,
    fecha_fin_planeado: formData.get("fecha_fin_planeado") || undefined,
    monto_contratado: formData.get("monto_contratado") || undefined,
    presupuesto_costo: formData.get("presupuesto_costo") || undefined,
    capacidad_kwp: formData.get("capacidad_kwp") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  };
}

async function gate(
  empresaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  if (!puedeGestionarProyectosEn(v, empresaId)) {
    return {
      ok: false,
      error:
        "Sin permiso (requiere CEO, Director u Operativo en la empresa).",
    };
  }
  return { ok: true };
}

export async function createProyecto(
  _prev: ProyectoState,
  formData: FormData,
): Promise<ProyectoState> {
  const parsed = ProyectoFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;
  const g = await gate(d.empresa_id);
  if (!g.ok) return { ok: false, error: g.error };

  const supabase = createClient();
  const { data: nuevo, error } = await supabase
    .from("proyectos")
    .insert({
      empresa_id: d.empresa_id,
      cliente_id: d.cliente_id,
      codigo: d.codigo,
      nombre: d.nombre,
      descripcion: d.descripcion,
      tipo: d.tipo,
      estado: d.estado,
      fecha_contrato: d.fecha_contrato,
      fecha_inicio_planeado: d.fecha_inicio_planeado,
      fecha_fin_planeado: d.fecha_fin_planeado,
      monto_contratado: d.monto_contratado,
      presupuesto_costo: d.presupuesto_costo,
      capacidad_kwp: d.capacidad_kwp,
      observaciones: d.observaciones,
      activo: true,
    })
    .select("id")
    .single();

  if (error || !nuevo) {
    return {
      ok: false,
      error: error?.message?.includes("duplicate")
        ? "Ya existe un proyecto con ese código en esta empresa."
        : `Error al guardar: ${error?.message}`,
    };
  }

  revalidatePath("/proyectos");
  redirect(`/proyectos/${nuevo.id}`);
}

export async function updateProyecto(
  proyectoId: string,
  _prev: ProyectoState,
  formData: FormData,
): Promise<ProyectoState> {
  const parsed = ProyectoFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;
  const g = await gate(d.empresa_id);
  if (!g.ok) return { ok: false, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("proyectos")
    .update({
      empresa_id: d.empresa_id,
      cliente_id: d.cliente_id,
      codigo: d.codigo,
      nombre: d.nombre,
      descripcion: d.descripcion,
      tipo: d.tipo,
      estado: d.estado,
      fecha_contrato: d.fecha_contrato,
      fecha_inicio_planeado: d.fecha_inicio_planeado,
      fecha_fin_planeado: d.fecha_fin_planeado,
      monto_contratado: d.monto_contratado,
      presupuesto_costo: d.presupuesto_costo,
      capacidad_kwp: d.capacidad_kwp,
      observaciones: d.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proyectoId);

  if (error) {
    return {
      ok: false,
      error: error.message?.includes("duplicate")
        ? "Conflicto: código duplicado en esta empresa."
        : `Error al actualizar: ${error.message}`,
    };
  }

  revalidatePath(`/proyectos/${proyectoId}`);
  revalidatePath("/proyectos");
  redirect(`/proyectos/${proyectoId}`);
}

export async function sugerirCodigoProyecto(
  empresaCodigo: string,
): Promise<string> {
  const supabase = createClient();
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("proyectos")
    .select("id", { count: "exact", head: true })
    .ilike("codigo", `${empresaCodigo}-${year}-%`);
  const next = (count ?? 0) + 1;
  return `${empresaCodigo}-${year}-${String(next).padStart(3, "0")}`;
}
