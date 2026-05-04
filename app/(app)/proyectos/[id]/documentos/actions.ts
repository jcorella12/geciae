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

const BUCKET = "proyecto-archivos";

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

function safeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
}

export async function subirDocumento(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const proyectoId = formData.get("proyecto_id") as string;
  const file = formData.get("archivo") as File | null;
  const categoria = (formData.get("categoria") as string) || "otro";
  const nombre = (formData.get("nombre") as string) || file?.name || "";
  const descripcion = (formData.get("descripcion") as string) || null;
  const visibleCliente = formData.get("visible_cliente") === "on";
  const tareaId = (formData.get("tarea_id") as string) || null;

  if (!proyectoId)
    return { ...initialSimpleFormState, error: "Falta proyecto" };
  if (!file || file.size === 0)
    return { ...initialSimpleFormState, error: "Selecciona un archivo" };
  if (file.size > 50 * 1024 * 1024)
    return { ...initialSimpleFormState, error: "Archivo > 50MB no permitido" };

  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleFormState, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const userMeta = usr.user?.user_metadata as
    | { full_name?: string; nombre?: string }
    | undefined;
  const userNombre =
    userMeta?.full_name ?? userMeta?.nombre ?? usr.user?.email ?? null;

  const ts = Date.now();
  const path = `${proyectoId}/${categoria}/${ts}_${safeName(file.name)}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadErr) {
    return {
      ...initialSimpleFormState,
      error: `Storage: ${uploadErr.message}`,
    };
  }
  const { error: insertErr } = await supabase.from("proyecto_documentos").insert({
    proyecto_id: proyectoId,
    // categoria es enum categoria_documento_proyecto; lo valida BD.
    categoria: categoria as never,
    nombre: nombre.trim() || file.name,
    descripcion,
    storage_path: path,
    mime_type: file.type || null,
    tamano_bytes: file.size,
    visible_cliente: visibleCliente,
    tarea_id: tareaId,
    subido_por: usr.user?.id,
    subido_por_nombre: userNombre,
  });

  if (insertErr) {
    // limpiar archivo huérfano
    await supabase.storage.from(BUCKET).remove([path]);
    return { ...initialSimpleFormState, error: insertErr.message };
  }

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}

export async function eliminarDocumento(
  documentoId: string,
  proyectoId: string,
  storagePath: string,
): Promise<SimpleFormState> {
  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleFormState, error: g.error };

  const supabase = createClient();
  const { error: delDb } = await supabase
    .from("proyecto_documentos")
    .delete()
    .eq("id", documentoId);
  if (delDb) return { ...initialSimpleFormState, error: delDb.message };

  await supabase.storage.from(BUCKET).remove([storagePath]);

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}

export async function getDownloadUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 600); // 10 min
  if (error) return null;
  return data.signedUrl;
}
