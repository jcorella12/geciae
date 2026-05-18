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
    marca_visible_id: formData.get("marca_visible_id") || undefined,
    uniforme_marca: formData.get("uniforme_marca") || undefined,
    plantilla_tipo: formData.get("plantilla_tipo") || undefined,
    modalidad_pago: formData.get("modalidad_pago") || undefined,
    verificador_id: formData.get("verificador_id") || undefined,
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
      // Marca visible: si no se eligió, default = empresa que opera
      marca_visible_id: (d.marca_visible_id ?? d.empresa_id) as never,
      uniforme_marca: d.uniforme_marca as never,
      // Sprint 6 fundamentos
      plantilla_tipo: d.plantilla_tipo as never,
      modalidad_pago: d.modalidad_pago as never,
      verificador_id: d.verificador_id as never,
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
      marca_visible_id: (d.marca_visible_id ?? d.empresa_id) as never,
      uniforme_marca: d.uniforme_marca as never,
      plantilla_tipo: d.plantilla_tipo as never,
      modalidad_pago: d.modalidad_pago as never,
      verificador_id: d.verificador_id as never,
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

/**
 * S3-T3 — Creación rápida de proyecto desde formularios externos
 * (asignación de OC, viático, ticket, etc.) cuando el proyecto no existe.
 *
 * Solo requiere: nombre + empresa_id + cliente_id. El código se autogenera
 * con `sugerirCodigoProyecto`. El estado arranca como "cotizacion" — el
 * PM puede mover al estado real desde la ficha del proyecto.
 */
export async function crearProyectoRapido(input: {
  nombre: string;
  empresa_id: string;
  cliente_id: string;
  codigo?: string;
  tipo?: string | null;
}): Promise<{
  ok: boolean;
  error: string | null;
  proyecto?: {
    id: string;
    codigo: string;
    nombre: string;
    empresa_id: string;
    cliente_id: string;
  };
}> {
  const nombre = input.nombre?.trim() ?? "";
  if (nombre.length < 3) {
    return { ok: false, error: "Nombre demasiado corto." };
  }

  const v = await obtenerVinculos();
  if (!puedeGestionarProyectosEn(v, input.empresa_id)) {
    return {
      ok: false,
      error: "Sin permiso para crear proyectos en esta empresa.",
    };
  }

  const supabase = createClient();

  // Resolver código: si no vino, autogenerar usando el código de la empresa.
  let codigo = input.codigo?.trim() ?? "";
  if (!codigo) {
    const { data: emp } = await supabase
      .from("empresas")
      .select("codigo")
      .eq("id", input.empresa_id)
      .maybeSingle();
    if (!emp) {
      return { ok: false, error: "Empresa no encontrada." };
    }
    codigo = await sugerirCodigoProyecto(emp.codigo);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nuevo, error } = await (supabase as any)
    .from("proyectos")
    .insert({
      empresa_id: input.empresa_id,
      cliente_id: input.cliente_id,
      codigo,
      nombre,
      tipo: (input.tipo || "otro") as never,
      estado: "cotizacion",
      marca_visible_id: input.empresa_id,
      semaforo: "verde",
      activo: true,
    })
    .select("id, codigo, nombre, empresa_id, cliente_id")
    .single();

  if (error || !nuevo) {
    if (error?.message?.includes("duplicate")) {
      return {
        ok: false,
        error: `Ya existe un proyecto con código ${codigo} en esta empresa.`,
      };
    }
    return {
      ok: false,
      error: error?.message ?? "Error al crear proyecto.",
    };
  }

  revalidatePath("/proyectos");
  return { ok: true, error: null, proyecto: nuevo };
}
