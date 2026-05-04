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

export async function registrarEventoBitacora(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const proyectoId = formData.get("proyecto_id") as string;
  if (!proyectoId)
    return { ...initialSimpleFormState, error: "Falta proyecto" };

  const tipo = formData.get("tipo") as string;
  const titulo = (formData.get("titulo") as string) || null;
  const descripcion = (formData.get("descripcion") as string) || "";
  const fecha = (formData.get("fecha") as string) || new Date().toISOString();
  const tareaId = (formData.get("tarea_id") as string) || null;
  const esCritica = formData.get("es_critica") === "on";
  const visibleCliente = formData.get("visible_cliente") === "on";

  if (!descripcion.trim()) {
    return { ...initialSimpleFormState, error: "Descripción requerida" };
  }

  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleFormState, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const userMeta = usr.user?.user_metadata as
    | { full_name?: string; nombre?: string }
    | undefined;
  const nombre =
    userMeta?.full_name ?? userMeta?.nombre ?? usr.user?.email ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const { error } = await supa.from("proyecto_bitacora").insert({
    proyecto_id: proyectoId,
    tipo,
    titulo,
    descripcion: descripcion.trim(),
    fecha,
    tarea_id: tareaId,
    es_critica: esCritica,
    visible_cliente: visibleCliente,
    capturado_por: usr.user?.id,
    capturado_por_nombre: nombre,
  });

  if (error) return { ...initialSimpleFormState, error: error.message };

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}

export async function eliminarEventoBitacora(
  eventoId: string,
  proyectoId: string,
): Promise<SimpleFormState> {
  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleFormState, error: g.error };

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const { error } = await supa
    .from("proyecto_bitacora")
    .delete()
    .eq("id", eventoId);

  if (error) return { ...initialSimpleFormState, error: error.message };

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}
