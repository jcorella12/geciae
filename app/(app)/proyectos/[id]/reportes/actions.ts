"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import {
  initialReporteFormState,
  initialSimpleState,
  type ReporteFormState,
  type SimpleState,
} from "@/lib/proyecto-reportes/state";
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

export async function crearReporte(
  _prev: ReporteFormState,
  formData: FormData,
): Promise<ReporteFormState> {
  const proyectoId = formData.get("proyecto_id") as string;
  if (!proyectoId)
    return { ...initialReporteFormState, error: "Falta proyecto" };

  const tipo = (formData.get("tipo") as string) || "otro";
  const severidad = (formData.get("severidad") as string) || "info";
  const titulo = (formData.get("titulo") as string)?.trim() || "";
  const resumen = (formData.get("resumen") as string)?.trim() || null;
  const contenido = (formData.get("contenido") as string)?.trim() || null;
  const fechaEvento = (formData.get("fecha_evento") as string) || null;
  const fechaReporte =
    (formData.get("fecha_reporte") as string) ||
    new Date().toISOString().slice(0, 10);
  const ubicacion = (formData.get("ubicacion") as string) || null;
  const impacto = (formData.get("impacto") as string) || null;
  const accionCorrectiva =
    (formData.get("accion_correctiva") as string) || null;
  const fechaCompromiso = (formData.get("fecha_compromiso") as string) || null;
  const responsableSeguimiento =
    (formData.get("responsable_seguimiento") as string) || null;
  const tareaId = (formData.get("tarea_id") as string) || null;
  const visibleCliente = formData.get("visible_cliente") === "on";
  const estadoInicial =
    (formData.get("estado") as string) === "emitido" ? "emitido" : "borrador";

  // Modo: "manual" (texto) o "pdf" (subir un PDF como reporte)
  const modo = (formData.get("modo") as string) || "manual";
  const archivoPdf = formData.get("archivo_pdf") as File | null;

  if (!titulo) {
    return { ...initialReporteFormState, error: "Título requerido" };
  }
  if (modo === "pdf") {
    if (!archivoPdf || archivoPdf.size === 0) {
      return {
        ...initialReporteFormState,
        error: "Selecciona un PDF (modo subir).",
      };
    }
    if (archivoPdf.size > 50 * 1024 * 1024) {
      return { ...initialReporteFormState, error: "PDF > 50MB no permitido" };
    }
  }

  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialReporteFormState, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const userMeta = usr.user?.user_metadata as
    | { full_name?: string; nombre?: string }
    | undefined;
  const nombre =
    userMeta?.full_name ?? userMeta?.nombre ?? usr.user?.email ?? null;

  // Snapshot del nombre del responsable
  let responsableNombre: string | null = null;
  if (responsableSeguimiento) {
    const { data: empleado } = await supabase
      .from("empleados")
      .select("nombre_completo")
      .eq("usuario_id", responsableSeguimiento)
      .maybeSingle();
    responsableNombre = empleado?.nombre_completo ?? null;
  }
  // `numero` es requerido en TS pero lo auto-genera un trigger en BD
  // (migración 20260516000000_proyecto_reportes.sql · RPT-{YEAR}-{seq}).
  // Por eso casteamos el payload entero a `never`.
  const insertPayload = {
    proyecto_id: proyectoId,
    // tipo/severidad/estado son enums (tipo_reporte_proyecto, etc.); BD valida.
    tipo,
    severidad,
    estado: estadoInicial,
    titulo,
    resumen,
    // En modo PDF, el contenido refiere al PDF anexo
    contenido:
      modo === "pdf"
        ? (contenido ?? "Reporte adjunto en PDF — ver archivo en sección de adjuntos.")
        : contenido,
    fecha_evento: fechaEvento,
    fecha_reporte: fechaReporte,
    ubicacion,
    impacto,
    accion_correctiva: accionCorrectiva,
    responsable_seguimiento: responsableSeguimiento,
    responsable_nombre: responsableNombre,
    fecha_compromiso: fechaCompromiso,
    tarea_id: tareaId,
    visible_cliente: visibleCliente,
    creado_por: usr.user?.id,
    creado_por_nombre: nombre,
  };
  const { data: nuevo, error } = await supabase
    .from("proyecto_reportes")
    .insert(insertPayload as never)
    .select("id")
    .single();

  if (error || !nuevo) {
    return {
      ...initialReporteFormState,
      error: error?.message ?? "Error al crear",
    };
  }

  // Si hay PDF (o cualquier archivo en archivo_pdf), subirlo y vincularlo
  if (archivoPdf && archivoPdf.size > 0) {
    const ts = Date.now();
    const path = `${proyectoId}/reportes/${nuevo.id}/${ts}_${safeName(archivoPdf.name)}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, archivoPdf, {
        contentType: archivoPdf.type || "application/pdf",
        upsert: false,
      });

    if (!upErr) {
      const adjunto = {
        path,
        nombre: archivoPdf.name,
        size: archivoPdf.size,
        mime: archivoPdf.type || "application/pdf",
        es_principal: modo === "pdf",
        subido_en: new Date().toISOString(),
      };
      await supabase
        .from("proyecto_reportes")
        .update({ adjuntos: [adjunto] })
        .eq("id", nuevo.id);
    } else {
      // Si falló el upload pero el reporte ya existe, lo dejamos sin adjunto
      // pero avisamos al usuario.
      revalidatePath(`/proyectos/${proyectoId}`);
      return {
        ok: true,
        error: `Reporte creado pero falló el adjunto: ${upErr.message}`,
        reporteId: nuevo.id as string,
      };
    }
  }

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null, reporteId: nuevo.id as string };
}

export async function actualizarEstadoReporte(
  reporteId: string,
  proyectoId: string,
  nuevoEstado: string,
): Promise<SimpleState> {
  const valid = ["borrador", "emitido", "en_seguimiento", "resuelto", "cerrado"];
  if (!valid.includes(nuevoEstado))
    return { ...initialSimpleState, error: "Estado inválido" };

  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleState, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("proyecto_reportes")
    // estado validado vs whitelist arriba; cast localizado al enum.
    .update({ estado: nuevoEstado as never })
    .eq("id", reporteId);

  if (error) return { ...initialSimpleState, error: error.message };

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}

export async function eliminarReporte(
  reporteId: string,
  proyectoId: string,
): Promise<SimpleState> {
  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleState, error: g.error };

  const supabase = createClient();
  // Recuperar adjuntos para limpiarlos del storage
  const { data: rep } = await supabase
    .from("proyecto_reportes")
    .select("adjuntos")
    .eq("id", reporteId)
    .maybeSingle();

  const paths: string[] = (rep?.adjuntos as Array<{ path: string }> | null)
    ?.map((a) => a.path)
    .filter(Boolean) ?? [];

  const { error } = await supabase
    .from("proyecto_reportes")
    .delete()
    .eq("id", reporteId);

  if (error) return { ...initialSimpleState, error: error.message };

  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}

export async function adjuntarArchivoAReporte(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const proyectoId = formData.get("proyecto_id") as string;
  const reporteId = formData.get("reporte_id") as string;
  const file = formData.get("archivo") as File | null;

  if (!proyectoId || !reporteId)
    return { ...initialSimpleState, error: "Faltan datos" };
  if (!file || file.size === 0)
    return { ...initialSimpleState, error: "Selecciona un archivo" };
  if (file.size > 50 * 1024 * 1024)
    return { ...initialSimpleState, error: "Archivo > 50MB" };

  const g = await gateProyecto(proyectoId);
  if (!g.ok) return { ...initialSimpleState, error: g.error };

  const supabase = createClient();
  const ts = Date.now();
  const path = `${proyectoId}/reportes/${reporteId}/${ts}_${safeName(file.name)}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (upErr) return { ...initialSimpleState, error: upErr.message };

  // Anexar al JSONB
  const { data: rep } = await supabase
    .from("proyecto_reportes")
    .select("adjuntos")
    .eq("id", reporteId)
    .maybeSingle();

  const prev = (rep?.adjuntos as
    | Array<{ path: string; nombre: string; size: number; mime: string }>
    | null) ?? [];
  const nuevos = [
    ...prev,
    {
      path,
      nombre: file.name,
      size: file.size,
      mime: file.type ?? "application/octet-stream",
      subido_en: new Date().toISOString(),
    },
  ];

  const { error: updErr } = await supabase
    .from("proyecto_reportes")
    .update({ adjuntos: nuevos })
    .eq("id", reporteId);

  if (updErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ...initialSimpleState, error: updErr.message };
  }

  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}

export async function getDownloadUrlReporte(
  storagePath: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 600);
  if (error) return null;
  return data.signedUrl;
}
