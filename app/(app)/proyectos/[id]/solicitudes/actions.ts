"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { crearNotificaciones, type NuevaNotif } from "@/lib/notificaciones/emisor";
import {
  AprobarSchema,
  AsignarSchema,
  ActualizarSolicitudSchema,
  CerrarSchema,
  ComentarioSchema,
  CrearSolicitudSchema,
  MarcarEjecutadaSchema,
  PasarAEnRevisionSchema,
  RechazarSchema,
} from "@/lib/solicitudes/schemas";
import {
  initialComentarioState,
  initialSimpleSolicitudState,
  initialSolicitudState,
  type ComentarioState,
  type EstadoSolicitud,
  type SimpleSolicitudState,
  type SolicitudState,
  type TipoSolicitud,
  type UrgenciaSolicitud,
} from "@/lib/solicitudes/state";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions Sprint 4.1 — Solicitudes de proyecto.
 *
 * Permisos generales (gateProyecto):
 *  - CEO: cualquier proyecto del grupo
 *  - PM del proyecto, administrador_id, vendedor_id
 *  - Director / operativo de la empresa del proyecto
 *  - Solicitante de la solicitud
 *  - Asignado a la solicitud
 *
 * Cada acción que cambia estado emite notificaciones al solicitante,
 * asignado y administrador (sprint 4.3 amplía con menciones y acciones
 * contextuales).
 */

async function gateProyecto(
  proyectoId: string,
): Promise<
  | {
      ok: true;
      empresaId: string;
      proyecto: {
        codigo: string;
        nombre: string;
        pm_id: string | null;
        administrador_id: string | null;
        empresa_id: string;
      };
    }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  // pedimos por separado vía cast `as never` (que devuelve el row crudo).
  const { data } = await supabase
    .from("proyectos")
    .select("id, codigo, nombre, empresa_id, pm_id, vendedor_id")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Proyecto no encontrado." };
  // Pedir administrador_id por separado (post-migration column).
  const { data: extra } = await supabase
    .from("proyectos")
    .select("administrador_id")
    .eq("id", proyectoId)
    .maybeSingle();
  const adminId =
    (extra as { administrador_id?: string | null } | null)
      ?.administrador_id ?? null;

  const v = await obtenerVinculos();
  const { data: usr } = await supabase.auth.getUser();
  const userId = usr.user?.id;
  const puede =
    esCEO(v) ||
    data.pm_id === userId ||
    data.vendedor_id === userId ||
    adminId === userId ||
    esRolEn(v, data.empresa_id, ["director", "operativo"]);
  if (!puede)
    return { ok: false, error: "Sin permiso sobre este proyecto." };
  return {
    ok: true,
    empresaId: data.empresa_id,
    proyecto: {
      codigo: data.codigo,
      nombre: data.nombre,
      pm_id: data.pm_id ?? null,
      administrador_id: adminId,
      empresa_id: data.empresa_id,
    },
  };
}

async function gateSolicitud(
  solicitudId: string,
): Promise<
  | {
      ok: true;
      empresaId: string;
      proyectoId: string;
      solicitud: {
        id: string;
        proyecto_id: string;
        empresa_id: string;
        tipo: TipoSolicitud;
        estado: EstadoSolicitud;
        solicitante_id: string;
        asignado_a_id: string | null;
        titulo: string;
        numero: string | null;
        urgencia: UrgenciaSolicitud;
      };
      proyecto: {
        codigo: string;
        nombre: string;
        pm_id: string | null;
        administrador_id: string | null;
        empresa_id: string;
      };
    }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("proyecto_solicitudes")
    .select(
      "id, proyecto_id, empresa_id, tipo, estado, solicitante_id, asignado_a_id, titulo, numero, urgencia",
    )
    .eq("id", solicitudId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Solicitud no encontrada." };
  const g = await gateProyecto(data.proyecto_id);
  if (!g.ok) return { ok: false, error: g.error };
  return {
    ok: true,
    empresaId: g.empresaId,
    proyectoId: data.proyecto_id,
    solicitud: {
      id: data.id,
      proyecto_id: data.proyecto_id,
      empresa_id: data.empresa_id,
      tipo: data.tipo as TipoSolicitud,
      estado: data.estado as EstadoSolicitud,
      solicitante_id: data.solicitante_id,
      asignado_a_id: data.asignado_a_id,
      titulo: data.titulo,
      numero: data.numero,
      urgencia: data.urgencia as UrgenciaSolicitud,
    },
    proyecto: g.proyecto,
  };
}

function flatErrors(
  err: { issues: Array<{ path: (string | number)[]; message: string }> },
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!out[k]) out[k] = [];
    out[k].push(i.message);
  }
  return out;
}

function urlSolicitud(proyectoId: string, solicitudId: string): string {
  return `/proyectos/${proyectoId}?tab=solicitudes&sol=${solicitudId}`;
}

/**
 * Notifica a un set de usuarios sobre un evento en una solicitud.
 * No bloquea (await void). Filtra al actor para no auto-notificarse.
 */
async function notificarSolicitud({
  destinatarios,
  actorId,
  empresaId,
  tipo,
  severidad,
  titulo,
  mensaje,
  proyectoId,
  solicitudId,
}: {
  destinatarios: Array<string | null | undefined>;
  actorId: string | null;
  empresaId: string;
  tipo: string;
  severidad?: NuevaNotif["severidad"];
  titulo: string;
  mensaje: string;
  proyectoId: string;
  solicitudId: string;
}): Promise<void> {
  const dest = Array.from(
    new Set(destinatarios.filter((d): d is string => Boolean(d) && d !== actorId)),
  );
  if (dest.length === 0) return;
  await crearNotificaciones(
    dest.map((u) => ({
      usuario_id: u,
      empresa_id: empresaId,
      tipo,
      severidad: severidad ?? "info",
      titulo,
      mensaje,
      url: urlSolicitud(proyectoId, solicitudId),
      entidad_tipo: "proyecto_solicitud",
      entidad_id: solicitudId,
    })),
  );
}

// ============================================================================
// Crear solicitud
// ============================================================================
export async function crearSolicitud(
  _prev: SolicitudState,
  formData: FormData,
): Promise<SolicitudState> {
  // campos_tipo viene como JSON serializado opcional
  let camposTipo: Record<string, unknown> = {};
  const ct = formData.get("campos_tipo");
  if (typeof ct === "string" && ct.trim().length > 0) {
    try {
      camposTipo = JSON.parse(ct);
    } catch {
      return {
        ...initialSolicitudState,
        error: "campos_tipo no es JSON válido.",
      };
    }
  }
  const parsed = CrearSolicitudSchema.safeParse({
    proyecto_id: formData.get("proyecto_id"),
    tipo: formData.get("tipo"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") ?? "",
    monto_estimado: formData.get("monto_estimado") || null,
    urgencia: formData.get("urgencia") || "normal",
    campos_tipo: camposTipo,
  });
  if (!parsed.success) {
    return {
      ...initialSolicitudState,
      error: "Revisa los campos.",
      fieldErrors: flatErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const g = await gateProyecto(d.proyecto_id);
  if (!g.ok) return { ...initialSolicitudState, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  if (!usr.user)
    return { ...initialSolicitudState, error: "Sesión expirada." };

  // Insert con `campos_tipo` JSONB y `tipo`/`urgencia` enum: Zod ya validó
  // las strings; cast localizado para evitar el RejectExcessProperties.
  const insertPayload = {
    proyecto_id: d.proyecto_id,
    empresa_id: g.empresaId,
    tipo: d.tipo,
    titulo: d.titulo,
    descripcion: d.descripcion,
    monto_estimado: d.monto_estimado ?? null,
    urgencia: d.urgencia,
    estado: "solicitada",
    solicitante_id: usr.user.id,
    campos_tipo: d.campos_tipo,
  };
  const { data: nuevo, error } = await supabase
    .from("proyecto_solicitudes")
    .insert(insertPayload as never)
    .select("id, numero")
    .single();
  if (error || !nuevo)
    return {
      ...initialSolicitudState,
      error: error?.message ?? "Error al crear",
    };

  // Notificación: al admin del proyecto si hay; si no, a directores de la empresa
  let destinatarios: string[] = [];
  if (g.proyecto.administrador_id) {
    destinatarios = [g.proyecto.administrador_id];
  } else {
    // Directores de la empresa
    const { data: dirs } = await supabase
      .from("usuarios_empresas")
      .select("usuario_id")
      .eq("empresa_id", g.empresaId)
      .eq("rol", "director")
      .eq("activo", true);
    destinatarios = (dirs ?? []).map((r) => r.usuario_id as string);
  }
  await notificarSolicitud({
    destinatarios,
    actorId: usr.user.id,
    empresaId: g.empresaId,
    tipo: "solicitud_creada",
    severidad:
      d.urgencia === "critica"
        ? "danger"
        : d.urgencia === "alta"
          ? "warning"
          : "info",
    titulo: `Nueva solicitud · ${nuevo.numero}`,
    mensaje: `${g.proyecto.codigo} · ${d.titulo}`,
    proyectoId: d.proyecto_id,
    solicitudId: nuevo.id,
  });

  revalidatePath(`/proyectos/${d.proyecto_id}`);
  revalidatePath("/solicitudes");
  return { ok: true, error: null, solicitudId: nuevo.id };
}

// ============================================================================
// Actualizar solicitud (título / descripción / monto / urgencia)
// ============================================================================
export async function actualizarSolicitud(
  _prev: SimpleSolicitudState,
  formData: FormData,
): Promise<SimpleSolicitudState> {
  const parsed = ActualizarSolicitudSchema.safeParse({
    solicitud_id: formData.get("solicitud_id"),
    titulo: formData.get("titulo") || undefined,
    descripcion: formData.get("descripcion") ?? undefined,
    monto_estimado: formData.get("monto_estimado") || null,
    urgencia: formData.get("urgencia") || undefined,
  });
  if (!parsed.success)
    return { ...initialSimpleSolicitudState, error: "Datos inválidos." };
  const g = await gateSolicitud(parsed.data.solicitud_id);
  if (!g.ok) return { ...initialSimpleSolicitudState, error: g.error };

  const patch: Record<string, unknown> = {};
  if (parsed.data.titulo !== undefined) patch.titulo = parsed.data.titulo;
  if (parsed.data.descripcion !== undefined)
    patch.descripcion = parsed.data.descripcion;
  if (parsed.data.monto_estimado !== undefined)
    patch.monto_estimado = parsed.data.monto_estimado;
  if (parsed.data.urgencia !== undefined)
    patch.urgencia = parsed.data.urgencia;
  if (Object.keys(patch).length === 0)
    return { ok: true, error: null };

  const supabase = createClient();
  const { error } = await supabase
    .from("proyecto_solicitudes")
    // Patch dinámico; cast localizado al tipo Update.
    .update(patch as never)
    .eq("id", parsed.data.solicitud_id);
  if (error)
    return { ...initialSimpleSolicitudState, error: error.message };

  revalidatePath(`/proyectos/${g.proyectoId}`);
  return { ok: true, error: null };
}

// ============================================================================
// Pasar a en_revision
// ============================================================================
export async function pasarAEnRevision(
  _prev: SimpleSolicitudState,
  formData: FormData,
): Promise<SimpleSolicitudState> {
  const parsed = PasarAEnRevisionSchema.safeParse({
    solicitud_id: formData.get("solicitud_id"),
  });
  if (!parsed.success)
    return { ...initialSimpleSolicitudState, error: "Datos inválidos." };
  const g = await gateSolicitud(parsed.data.solicitud_id);
  if (!g.ok) return { ...initialSimpleSolicitudState, error: g.error };
  if (g.solicitud.estado !== "solicitada")
    return {
      ...initialSimpleSolicitudState,
      error: "Solo solicitudes en estado 'solicitada' pueden pasar a revisión.",
    };

  const supabase = createClient();
  const { error } = await supabase
    .from("proyecto_solicitudes")
    .update({ estado: "en_revision" })
    .eq("id", parsed.data.solicitud_id);
  if (error)
    return { ...initialSimpleSolicitudState, error: error.message };

  revalidatePath(`/proyectos/${g.proyectoId}`);
  return { ok: true, error: null };
}

// ============================================================================
// Aprobar
// ============================================================================
export async function aprobarSolicitud(
  _prev: SimpleSolicitudState,
  formData: FormData,
): Promise<SimpleSolicitudState> {
  const parsed = AprobarSchema.safeParse({
    solicitud_id: formData.get("solicitud_id"),
    comentario: formData.get("comentario") ?? "",
  });
  if (!parsed.success)
    return { ...initialSimpleSolicitudState, error: "Datos inválidos." };
  const g = await gateSolicitud(parsed.data.solicitud_id);
  if (!g.ok) return { ...initialSimpleSolicitudState, error: g.error };
  if (!["solicitada", "en_revision"].includes(g.solicitud.estado))
    return {
      ...initialSimpleSolicitudState,
      error: "Solo se pueden aprobar solicitudes en revisión o solicitadas.",
    };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("proyecto_solicitudes")
    .update({
      estado: "aprobada",
      resuelta_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.solicitud_id);
  if (error)
    return { ...initialSimpleSolicitudState, error: error.message };

  if (parsed.data.comentario && usr.user) {
    await supabase.from("solicitud_comentarios").insert({
      solicitud_id: parsed.data.solicitud_id,
      autor_id: usr.user.id,
      texto: `[Aprobada] ${parsed.data.comentario}`,
    });
  }

  // Notificar al solicitante
  await notificarSolicitud({
    destinatarios: [g.solicitud.solicitante_id],
    actorId: usr.user?.id ?? null,
    empresaId: g.solicitud.empresa_id,
    tipo: "solicitud_aprobada",
    severidad: "success",
    titulo: `Solicitud aprobada · ${g.solicitud.numero ?? ""}`,
    mensaje: `${g.proyecto.codigo} · ${g.solicitud.titulo}`,
    proyectoId: g.proyectoId,
    solicitudId: parsed.data.solicitud_id,
  });

  revalidatePath(`/proyectos/${g.proyectoId}`);
  revalidatePath("/solicitudes");
  return { ok: true, error: null };
}

// ============================================================================
// Rechazar
// ============================================================================
export async function rechazarSolicitud(
  _prev: SimpleSolicitudState,
  formData: FormData,
): Promise<SimpleSolicitudState> {
  const parsed = RechazarSchema.safeParse({
    solicitud_id: formData.get("solicitud_id"),
    razon: formData.get("razon"),
  });
  if (!parsed.success)
    return {
      ...initialSimpleSolicitudState,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  const g = await gateSolicitud(parsed.data.solicitud_id);
  if (!g.ok) return { ...initialSimpleSolicitudState, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("proyecto_solicitudes")
    .update({
      estado: "rechazada",
      razon_rechazo: parsed.data.razon,
      resuelta_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.solicitud_id);
  if (error)
    return { ...initialSimpleSolicitudState, error: error.message };

  await notificarSolicitud({
    destinatarios: [g.solicitud.solicitante_id],
    actorId: usr.user?.id ?? null,
    empresaId: g.solicitud.empresa_id,
    tipo: "solicitud_rechazada",
    severidad: "warning",
    titulo: `Solicitud rechazada · ${g.solicitud.numero ?? ""}`,
    mensaje: parsed.data.razon.slice(0, 200),
    proyectoId: g.proyectoId,
    solicitudId: parsed.data.solicitud_id,
  });

  revalidatePath(`/proyectos/${g.proyectoId}`);
  revalidatePath("/solicitudes");
  return { ok: true, error: null };
}

// ============================================================================
// Marcar ejecutada
// ============================================================================
export async function marcarEjecutada(
  _prev: SimpleSolicitudState,
  formData: FormData,
): Promise<SimpleSolicitudState> {
  const parsed = MarcarEjecutadaSchema.safeParse({
    solicitud_id: formData.get("solicitud_id"),
    comentario: formData.get("comentario") ?? "",
  });
  if (!parsed.success)
    return { ...initialSimpleSolicitudState, error: "Datos inválidos." };
  const g = await gateSolicitud(parsed.data.solicitud_id);
  if (!g.ok) return { ...initialSimpleSolicitudState, error: g.error };
  if (g.solicitud.estado !== "aprobada")
    return {
      ...initialSimpleSolicitudState,
      error: "Solo solicitudes aprobadas pueden marcarse como ejecutadas.",
    };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("proyecto_solicitudes")
    .update({ estado: "ejecutada" })
    .eq("id", parsed.data.solicitud_id);
  if (error)
    return { ...initialSimpleSolicitudState, error: error.message };

  if (parsed.data.comentario && usr.user) {
    await supabase.from("solicitud_comentarios").insert({
      solicitud_id: parsed.data.solicitud_id,
      autor_id: usr.user.id,
      texto: `[Ejecutada] ${parsed.data.comentario}`,
    });
  }

  await notificarSolicitud({
    destinatarios: [
      g.solicitud.solicitante_id,
      g.solicitud.asignado_a_id,
      g.proyecto.administrador_id,
    ],
    actorId: usr.user?.id ?? null,
    empresaId: g.solicitud.empresa_id,
    tipo: "solicitud_ejecutada",
    severidad: "success",
    titulo: `Solicitud ejecutada · ${g.solicitud.numero ?? ""}`,
    mensaje: `${g.proyecto.codigo} · ${g.solicitud.titulo}`,
    proyectoId: g.proyectoId,
    solicitudId: parsed.data.solicitud_id,
  });

  revalidatePath(`/proyectos/${g.proyectoId}`);
  revalidatePath("/solicitudes");
  return { ok: true, error: null };
}

// ============================================================================
// Cerrar
// ============================================================================
export async function cerrarSolicitud(
  _prev: SimpleSolicitudState,
  formData: FormData,
): Promise<SimpleSolicitudState> {
  const parsed = CerrarSchema.safeParse({
    solicitud_id: formData.get("solicitud_id"),
  });
  if (!parsed.success)
    return { ...initialSimpleSolicitudState, error: "Datos inválidos." };
  const g = await gateSolicitud(parsed.data.solicitud_id);
  if (!g.ok) return { ...initialSimpleSolicitudState, error: g.error };
  if (
    !["ejecutada", "aprobada", "rechazada"].includes(g.solicitud.estado)
  )
    return {
      ...initialSimpleSolicitudState,
      error:
        "Cerrar requiere que la solicitud esté ejecutada, aprobada o rechazada.",
    };

  const supabase = createClient();
  const { error } = await supabase
    .from("proyecto_solicitudes")
    .update({ estado: "cerrada" })
    .eq("id", parsed.data.solicitud_id);
  if (error)
    return { ...initialSimpleSolicitudState, error: error.message };

  revalidatePath(`/proyectos/${g.proyectoId}`);
  revalidatePath("/solicitudes");
  return { ok: true, error: null };
}

// ============================================================================
// Asignar
// ============================================================================
export async function asignarSolicitud(
  _prev: SimpleSolicitudState,
  formData: FormData,
): Promise<SimpleSolicitudState> {
  const parsed = AsignarSchema.safeParse({
    solicitud_id: formData.get("solicitud_id"),
    asignado_a_id: formData.get("asignado_a_id") ?? "",
  });
  if (!parsed.success)
    return { ...initialSimpleSolicitudState, error: "Datos inválidos." };
  const g = await gateSolicitud(parsed.data.solicitud_id);
  if (!g.ok) return { ...initialSimpleSolicitudState, error: g.error };

  // Solo CEO/director puede reasignar (asegurar permiso superior)
  const v = await obtenerVinculos();
  const puedeAsignar =
    esCEO(v) ||
    esRolEn(v, g.solicitud.empresa_id, "director") ||
    g.proyecto.pm_id ===
      (await createClient().auth.getUser()).data.user?.id ||
    g.proyecto.administrador_id ===
      (await createClient().auth.getUser()).data.user?.id;
  if (!puedeAsignar)
    return {
      ...initialSimpleSolicitudState,
      error: "Solo CEO, director, PM o administrador del proyecto puede asignar.",
    };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("proyecto_solicitudes")
    .update({ asignado_a_id: parsed.data.asignado_a_id })
    .eq("id", parsed.data.solicitud_id);
  if (error)
    return { ...initialSimpleSolicitudState, error: error.message };

  if (parsed.data.asignado_a_id) {
    await notificarSolicitud({
      destinatarios: [parsed.data.asignado_a_id],
      actorId: usr.user?.id ?? null,
      empresaId: g.solicitud.empresa_id,
      tipo: "solicitud_asignada",
      severidad:
        g.solicitud.urgencia === "critica"
          ? "danger"
          : g.solicitud.urgencia === "alta"
            ? "warning"
            : "info",
      titulo: `Solicitud asignada · ${g.solicitud.numero ?? ""}`,
      mensaje: `${g.proyecto.codigo} · ${g.solicitud.titulo}`,
      proyectoId: g.proyectoId,
      solicitudId: parsed.data.solicitud_id,
    });
  }

  revalidatePath(`/proyectos/${g.proyectoId}`);
  revalidatePath("/solicitudes");
  return { ok: true, error: null };
}

// ============================================================================
// Comentario
// ============================================================================
export async function agregarComentario(
  _prev: ComentarioState,
  formData: FormData,
): Promise<ComentarioState> {
  // menciones viene como JSON serializado
  let menciones: string[] = [];
  const m = formData.get("menciones");
  if (typeof m === "string" && m.trim().length > 0) {
    try {
      const arr = JSON.parse(m);
      if (Array.isArray(arr)) menciones = arr;
    } catch {
      // Ignora si no es JSON válido — mejor que fallar el comentario
    }
  }
  const parsed = ComentarioSchema.safeParse({
    solicitud_id: formData.get("solicitud_id"),
    texto: formData.get("texto"),
    menciones,
  });
  if (!parsed.success)
    return {
      ...initialComentarioState,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  const g = await gateSolicitud(parsed.data.solicitud_id);
  if (!g.ok) return { ...initialComentarioState, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  if (!usr.user)
    return { ...initialComentarioState, error: "Sesión expirada." };

  const { error } = await supabase.from("solicitud_comentarios").insert({
    solicitud_id: parsed.data.solicitud_id,
    autor_id: usr.user.id,
    texto: parsed.data.texto,
    menciones: parsed.data.menciones,
  });
  if (error) return { ...initialComentarioState, error: error.message };

  // Notificar a participantes (solicitante + asignado + admin) y a mencionados
  await notificarSolicitud({
    destinatarios: [
      g.solicitud.solicitante_id,
      g.solicitud.asignado_a_id,
      g.proyecto.administrador_id,
    ],
    actorId: usr.user.id,
    empresaId: g.solicitud.empresa_id,
    tipo: "solicitud_comentario",
    titulo: `Nuevo comentario en ${g.solicitud.numero ?? "solicitud"}`,
    mensaje: parsed.data.texto.slice(0, 200),
    proyectoId: g.proyectoId,
    solicitudId: parsed.data.solicitud_id,
  });
  if (parsed.data.menciones.length > 0) {
    await notificarSolicitud({
      destinatarios: parsed.data.menciones,
      actorId: usr.user.id,
      empresaId: g.solicitud.empresa_id,
      tipo: "solicitud_mencion",
      severidad: "warning",
      titulo: `Te mencionaron en ${g.solicitud.numero ?? "una solicitud"}`,
      mensaje: parsed.data.texto.slice(0, 200),
      proyectoId: g.proyectoId,
      solicitudId: parsed.data.solicitud_id,
    });
  }

  revalidatePath(`/proyectos/${g.proyectoId}`);
  return { ok: true, error: null };
}

/**
 * Sprint 4.3 — vincular entidad creada (OC, OT, CFDI...) a la solicitud.
 *
 * Usado cuando el usuario crea una OC desde una solicitud aprobada y
 * regresa al detalle. Marca también la solicitud como ejecutada
 * automáticamente si así se solicita.
 */
export async function vincularEntidadASolicitud(
  solicitudId: string,
  campo: "oc_id" | "ot_id" | "cfdi_id" | "gasto_id" | "addendum_id",
  entidadId: string,
  marcarEjecutada = true,
): Promise<SimpleSolicitudState> {
  const g = await gateSolicitud(solicitudId);
  if (!g.ok) return { ...initialSimpleSolicitudState, error: g.error };

  const supabase = createClient();
  const { data: actual } = await supabase
    .from("proyecto_solicitudes")
    .select("entidades_relacionadas")
    .eq("id", solicitudId)
    .maybeSingle();
  const prev = ((actual?.entidades_relacionadas ?? {}) as Record<
    string,
    string
  >);
  const next = { ...prev, [campo]: entidadId };

  const patch: Record<string, unknown> = { entidades_relacionadas: next };
  if (marcarEjecutada && g.solicitud.estado === "aprobada") {
    patch.estado = "ejecutada";
  }

  const { error } = await supabase
    .from("proyecto_solicitudes")
    // Patch dinámico; cast localizado al tipo Update.
    .update(patch as never)
    .eq("id", solicitudId);
  if (error)
    return { ...initialSimpleSolicitudState, error: error.message };

  revalidatePath(`/proyectos/${g.proyectoId}`);
  revalidatePath("/solicitudes");
  return { ok: true, error: null };
}
