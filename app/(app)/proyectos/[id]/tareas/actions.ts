"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { crearNotificaciones } from "@/lib/notificaciones/emisor";
import {
  initialSimpleState,
  initialTareaState,
  type SimpleState,
  type TareaState,
} from "@/lib/proyecto-tareas/state";
import { createClient } from "@/lib/supabase/server";

const TareaSchema = z.object({
  proyecto_id: z.string().uuid(),
  titulo: z.string().min(2, "Título requerido"),
  descripcion: z.string().optional().nullable(),
  estado: z
    .enum(["pendiente", "en_curso", "bloqueada", "completada", "cancelada"])
    .default("pendiente"),
  prioridad: z
    .enum(["baja", "media", "alta", "urgente"])
    .default("media"),
  es_hito: z.coerce.boolean().optional().default(false),
  fecha_inicio_planeada: z.string().optional().nullable(),
  fecha_fin_planeada: z.string().optional().nullable(),
  porcentaje_avance: z.coerce.number().int().min(0).max(100).default(0),
  asignado_a: z.string().uuid().optional().nullable(),
  horas_estimadas: z.coerce.number().min(0).optional().nullable(),
  costo_estimado: z.coerce.number().min(0).optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

async function gateProyecto(
  proyectoId: string,
): Promise<{ ok: true; empresaId: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("proyectos")
    .select("empresa_id, pm_id")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!p) return { ok: false, error: "Proyecto no encontrado" };
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    esRolEn(v, p.empresa_id, ["director", "operativo"]) ||
    p.pm_id ===
      (await supabase.auth.getUser()).data.user?.id;
  if (!puede) return { ok: false, error: "Sin permiso." };
  return { ok: true, empresaId: p.empresa_id };
}

function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === "" || v === null) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export async function crearTarea(
  _prev: TareaState,
  formData: FormData,
): Promise<TareaState> {
  const proyectoId = formData.get("proyecto_id") as string;
  if (!proyectoId) return { ...initialTareaState, error: "Falta proyecto" };

  const parsed = TareaSchema.safeParse({
    proyecto_id: proyectoId,
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || null,
    estado: formData.get("estado") || "pendiente",
    prioridad: formData.get("prioridad") || "media",
    es_hito: formData.get("es_hito") === "on",
    fecha_inicio_planeada: formData.get("fecha_inicio_planeada") || null,
    fecha_fin_planeada: formData.get("fecha_fin_planeada") || null,
    porcentaje_avance: formData.get("porcentaje_avance") || 0,
    asignado_a: formData.get("asignado_a") || null,
    horas_estimadas: formData.get("horas_estimadas") || null,
    costo_estimado: formData.get("costo_estimado") || null,
    parent_id: formData.get("parent_id") || null,
    observaciones: formData.get("observaciones") || null,
  });

  if (!parsed.success) {
    return {
      ...initialTareaState,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialTareaState, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();

  const insertData = clean({
    ...parsed.data,
    capturado_por: usr.user?.id,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const { data, error } = await supa
    .from("proyecto_tareas")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    return { ...initialTareaState, error: error.message };
  }

  // Notificar al asignado
  if (parsed.data.asignado_a) {
    void crearNotificaciones([
      {
        usuario_id: parsed.data.asignado_a,
        empresa_id: g.empresaId,
        tipo: "tarea_asignada",
        severidad:
          parsed.data.prioridad === "urgente"
            ? "danger"
            : parsed.data.prioridad === "alta"
              ? "warning"
              : "info",
        titulo: `Tarea asignada: ${parsed.data.titulo}`,
        mensaje: parsed.data.fecha_fin_planeada
          ? `Vence ${parsed.data.fecha_fin_planeada}`
          : null,
        url: `/proyectos/${proyectoId}`,
        entidad_tipo: "proyecto_tarea",
        entidad_id: data.id as string,
      },
    ]);
  }

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null, id: data.id as string };
}

export async function actualizarTarea(
  tareaId: string,
  _prev: TareaState,
  formData: FormData,
): Promise<TareaState> {
  const proyectoId = formData.get("proyecto_id") as string;
  if (!proyectoId) return { ...initialTareaState, error: "Falta proyecto" };

  const parsed = TareaSchema.safeParse({
    proyecto_id: proyectoId,
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || null,
    estado: formData.get("estado") || "pendiente",
    prioridad: formData.get("prioridad") || "media",
    es_hito: formData.get("es_hito") === "on",
    fecha_inicio_planeada: formData.get("fecha_inicio_planeada") || null,
    fecha_fin_planeada: formData.get("fecha_fin_planeada") || null,
    porcentaje_avance: formData.get("porcentaje_avance") || 0,
    asignado_a: formData.get("asignado_a") || null,
    horas_estimadas: formData.get("horas_estimadas") || null,
    costo_estimado: formData.get("costo_estimado") || null,
    parent_id: formData.get("parent_id") || null,
    observaciones: formData.get("observaciones") || null,
  });

  if (!parsed.success) {
    return {
      ...initialTareaState,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialTareaState, error: g.error };

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const updateData = clean(parsed.data);
  const { error } = await supa
    .from("proyecto_tareas")
    .update(updateData)
    .eq("id", tareaId);

  if (error) {
    return { ...initialTareaState, error: error.message };
  }

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null, id: tareaId };
}

export async function moverTareaEstado(
  tareaId: string,
  proyectoId: string,
  nuevoEstado: string,
): Promise<SimpleState> {
  const valid = [
    "pendiente",
    "en_curso",
    "bloqueada",
    "completada",
    "cancelada",
  ];
  if (!valid.includes(nuevoEstado))
    return { ...initialSimpleState, error: "Estado inválido" };

  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleState, error: g.error };

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const { error } = await supa
    .from("proyecto_tareas")
    .update({
      estado: nuevoEstado,
      ...(nuevoEstado === "completada"
        ? { porcentaje_avance: 100 }
        : nuevoEstado === "en_curso"
          ? { porcentaje_avance: 50 }
          : {}),
    })
    .eq("id", tareaId);

  if (error) return { ...initialSimpleState, error: error.message };

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}

export async function actualizarAvanceTarea(
  tareaId: string,
  proyectoId: string,
  porcentaje: number,
): Promise<SimpleState> {
  if (porcentaje < 0 || porcentaje > 100)
    return { ...initialSimpleState, error: "Porcentaje fuera de rango" };

  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleState, error: g.error };

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;

  const patch: Record<string, unknown> = { porcentaje_avance: porcentaje };
  if (porcentaje === 100) patch.estado = "completada";
  else if (porcentaje > 0) patch.estado = "en_curso";

  const { error } = await supa
    .from("proyecto_tareas")
    .update(patch)
    .eq("id", tareaId);

  if (error) return { ...initialSimpleState, error: error.message };

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}

/**
 * Adjuntar archivo a una tarea: lo sube al bucket proyecto-archivos y
 * crea un registro en proyecto_documentos vinculado a la tarea.
 */
export async function adjuntarArchivoATarea(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const proyectoId = formData.get("proyecto_id") as string;
  const tareaId = formData.get("tarea_id") as string;
  const file = formData.get("archivo") as File | null;

  if (!proyectoId || !tareaId)
    return { ...initialSimpleState, error: "Faltan datos" };
  if (!file || file.size === 0)
    return { ...initialSimpleState, error: "Selecciona un archivo" };
  if (file.size > 50 * 1024 * 1024)
    return { ...initialSimpleState, error: "Archivo > 50MB" };

  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleState, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const userMeta = usr.user?.user_metadata as
    | { full_name?: string; nombre?: string }
    | undefined;
  const userNombre =
    userMeta?.full_name ?? userMeta?.nombre ?? usr.user?.email ?? null;

  const safeName = (n: string) =>
    n
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 100);
  const ts = Date.now();
  const path = `${proyectoId}/tareas/${tareaId}/${ts}_${safeName(file.name)}`;

  const { error: upErr } = await supabase.storage
    .from("proyecto-archivos")
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return { ...initialSimpleState, error: upErr.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const { error: insErr } = await supa.from("proyecto_documentos").insert({
    proyecto_id: proyectoId,
    categoria: "otro",
    nombre: file.name,
    storage_path: path,
    mime_type: file.type || null,
    tamano_bytes: file.size,
    tarea_id: tareaId,
    subido_por: usr.user?.id,
    subido_por_nombre: userNombre,
  });

  if (insErr) {
    await supabase.storage.from("proyecto-archivos").remove([path]);
    return { ...initialSimpleState, error: insErr.message };
  }

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}

export async function eliminarTarea(
  tareaId: string,
  proyectoId: string,
): Promise<SimpleState> {
  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleState, error: g.error };

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const { error } = await supa
    .from("proyecto_tareas")
    .delete()
    .eq("id", tareaId);

  if (error) return { ...initialSimpleState, error: error.message };

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}
