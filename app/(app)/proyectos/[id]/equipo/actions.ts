"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import {
  initialSimpleFormState,
  type SimpleFormState,
} from "@/lib/proyecto-extras/state";
import { createClient } from "@/lib/supabase/server";

async function gateProyecto(
  proyectoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("proyectos")
    .select("empresa_id, pm_id")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!p) return { ok: false, error: "Proyecto no encontrado" };
  const v = await obtenerVinculos();
  const { data: usr } = await supabase.auth.getUser();
  const puede =
    esCEO(v) ||
    esRolEn(v, p.empresa_id, ["director", "operativo"]) ||
    p.pm_id === usr.user?.id;
  if (!puede) return { ok: false, error: "Sin permiso." };
  return { ok: true };
}

export async function agregarMiembro(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const proyectoId = formData.get("proyecto_id") as string;
  const usuarioId = formData.get("usuario_id") as string;
  const rol = formData.get("rol") as string;
  const observaciones = (formData.get("observaciones") as string) || null;

  if (!proyectoId || !usuarioId || !rol)
    return { ...initialSimpleFormState, error: "Faltan campos requeridos" };

  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleFormState, error: g.error };

  const supabase = createClient();
  // Snapshot del nombre del usuario (desde empleados)
  const { data: empleado } = await supabase
    .from("empleados")
    .select("nombre_completo")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  const nombreCompleto = empleado?.nombre_completo ?? null;

  const { data: usr } = await supabase.auth.getUser();
  const { error } = await supabase.from("proyecto_equipo").insert({
    proyecto_id: proyectoId,
    usuario_id: usuarioId,
    usuario_nombre: nombreCompleto,
    // rol es enum rol_equipo_proyecto; lo valida BD.
    rol: rol as never,
    observaciones,
    agregado_por: usr.user?.id,
  });

  if (error) {
    if (error.message?.includes("duplicate"))
      return {
        ...initialSimpleFormState,
        error: "Ese usuario ya está en el equipo con ese rol.",
      };
    return { ...initialSimpleFormState, error: error.message };
  }

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}

export async function removerMiembro(
  miembroId: string,
  proyectoId: string,
): Promise<SimpleFormState> {
  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleFormState, error: g.error };

  const supabase = createClient();
  // Marcar baja en lugar de eliminar para histórico
  const { error } = await supabase
    .from("proyecto_equipo")
    .update({ fecha_baja: new Date().toISOString().slice(0, 10) })
    .eq("id", miembroId);

  if (error) return { ...initialSimpleFormState, error: error.message };

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}
