"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  puedeGestionarEmpleadosEn,
} from "@/lib/auth/permisos";
import { extraerTicket, type DatosTicket } from "@/lib/claude/extractors/ticket";
import { crearNotificaciones } from "@/lib/notificaciones/emisor";
import {
  DocumentoEmpleadoSchema,
  VacacionSchema,
  ViaticoSchema,
} from "@/lib/personas/schemas";
import type {
  VacacionState,
  ViaticoState,
} from "@/lib/personas/state";
import { createClient } from "@/lib/supabase/server";

// =====================================================================
// VACACIONES
// =====================================================================

export async function solicitarVacaciones(
  _prev: VacacionState,
  formData: FormData,
): Promise<VacacionState> {
  const parsed = VacacionSchema.safeParse({
    empleado_id: formData.get("empleado_id"),
    tipo: formData.get("tipo"),
    fecha_inicio: formData.get("fecha_inicio"),
    fecha_fin: formData.get("fecha_fin"),
    motivo: formData.get("motivo") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const d = parsed.data;
  const dias =
    Math.floor(
      (new Date(d.fecha_fin).getTime() - new Date(d.fecha_inicio).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1;

  const { data: emp } = await supabase
    .from("empleados")
    .select("usuario_id, empresa_id, nombre_completo")
    .eq("id", d.empleado_id)
    .maybeSingle();
  if (!emp) return { ok: false, error: "Empleado no encontrado." };

  const v = await obtenerVinculos();
  const esElPropio = emp.usuario_id === user.id;
  const puedeGestionar = puedeGestionarEmpleadosEn(v, emp.empresa_id);
  if (!esElPropio && !puedeGestionar) {
    return { ok: false, error: "Sin permiso." };
  }

  const { data: solicitud, error } = await supabase
    .from("vacaciones_solicitudes")
    .insert({
      empleado_id: d.empleado_id,
      tipo: d.tipo,
      fecha_inicio: d.fecha_inicio,
      fecha_fin: d.fecha_fin,
      dias,
      motivo: d.motivo,
      estado: "pendiente",
    })
    .select("id")
    .single();
  if (error || !solicitud) {
    return { ok: false, error: error?.message ?? "Error al solicitar." };
  }

  const { data: dirs } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id")
    .eq("empresa_id", emp.empresa_id)
    .in("rol", ["director", "ceo"])
    .eq("activo", true);
  await crearNotificaciones(
    (dirs ?? [])
      .filter((dir) => dir.usuario_id !== user.id)
      .map((dir) => ({
        usuario_id: dir.usuario_id as string,
        empresa_id: emp.empresa_id,
        tipo: "vacaciones_solicitud",
        severidad: "info" as const,
        titulo: `Solicitud de vacaciones · ${emp.nombre_completo}`,
        mensaje: `${dias} día${dias === 1 ? "" : "s"} del ${new Date(d.fecha_inicio).toLocaleDateString("es-MX")} al ${new Date(d.fecha_fin).toLocaleDateString("es-MX")}.`,
        url: `/personas/${d.empleado_id}`,
        entidad_tipo: "vacacion_solicitud",
        entidad_id: solicitud.id,
      })),
  );

  revalidatePath(`/personas/${d.empleado_id}`);
  revalidatePath("/personas");
  return { ok: true, error: null };
}

export async function aprobarVacacion(
  solicitudId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: s } = await supabase
    .from("vacaciones_solicitudes")
    .select("id, empleado_id, estado, dias, fecha_inicio")
    .eq("id", solicitudId)
    .maybeSingle();
  if (!s) return { ok: false, error: "Solicitud no encontrada." };
  if (s.estado !== "pendiente") {
    return { ok: false, error: "Ya no está pendiente." };
  }

  const { data: emp } = await supabase
    .from("empleados")
    .select("empresa_id, usuario_id, nombre_completo")
    .eq("id", s.empleado_id)
    .maybeSingle();
  if (!emp) return { ok: false, error: "Empleado no encontrado." };

  const v = await obtenerVinculos();
  if (!esCEO(v) && !esRolEn(v, emp.empresa_id, "director")) {
    return { ok: false, error: "Sin permiso." };
  }

  const { error } = await supabase
    .from("vacaciones_solicitudes")
    .update({
      estado: "aprobada",
      aprobado_por: user.id,
      fecha_aprobacion: new Date().toISOString(),
    })
    .eq("id", solicitudId);
  if (error) return { ok: false, error: error.message };

  if (emp.usuario_id) {
    await crearNotificaciones([
      {
        usuario_id: emp.usuario_id,
        empresa_id: emp.empresa_id,
        tipo: "vacaciones_aprobada",
        severidad: "success",
        titulo: "Vacaciones aprobadas",
        mensaje: `${s.dias} día${s.dias === 1 ? "" : "s"} a partir del ${new Date(s.fecha_inicio).toLocaleDateString("es-MX")}.`,
        url: `/personas/${s.empleado_id}`,
      },
    ]);
  }

  revalidatePath(`/personas/${s.empleado_id}`);
  revalidatePath("/personas");
  return { ok: true, error: null };
}

export async function rechazarVacacion(
  solicitudId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: s } = await supabase
    .from("vacaciones_solicitudes")
    .select("id, empleado_id, estado")
    .eq("id", solicitudId)
    .maybeSingle();
  if (!s) return { ok: false, error: "No encontrada." };
  if (s.estado !== "pendiente") {
    return { ok: false, error: "Ya no está pendiente." };
  }

  const { data: emp } = await supabase
    .from("empleados")
    .select("empresa_id, usuario_id")
    .eq("id", s.empleado_id)
    .maybeSingle();
  if (!emp) return { ok: false, error: "Empleado no encontrado." };

  const v = await obtenerVinculos();
  if (!esCEO(v) && !esRolEn(v, emp.empresa_id, "director")) {
    return { ok: false, error: "Sin permiso." };
  }

  const { error } = await supabase
    .from("vacaciones_solicitudes")
    .update({
      estado: "rechazada",
      aprobado_por: user.id,
      fecha_aprobacion: new Date().toISOString(),
      observaciones: motivo,
    })
    .eq("id", solicitudId);
  if (error) return { ok: false, error: error.message };

  if (emp.usuario_id) {
    await crearNotificaciones([
      {
        usuario_id: emp.usuario_id,
        empresa_id: emp.empresa_id,
        tipo: "vacaciones_rechazada",
        severidad: "warning",
        titulo: "Solicitud de vacaciones rechazada",
        mensaje: motivo,
        url: `/personas/${s.empleado_id}`,
      },
    ]);
  }

  revalidatePath(`/personas/${s.empleado_id}`);
  return { ok: true, error: null };
}

// =====================================================================
// VIÁTICOS — OCR de ticket con IA
// =====================================================================

export async function ocrTicketViatico(
  formData: FormData,
): Promise<
  | { ok: true; datos: DatosTicket; confidence: number }
  | { ok: false; error: string }
> {
  const archivo = formData.get("ticket") as File | null;
  const empresaId = formData.get("empresa_id") as string | null;
  if (!archivo || archivo.size === 0) {
    return { ok: false, error: "Falta archivo." };
  }
  if (archivo.size > 8 * 1024 * 1024) {
    return { ok: false, error: "Archivo excede 8 MB." };
  }
  const mediaType = archivo.type;
  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ].includes(mediaType)
  ) {
    return {
      ok: false,
      error: `Tipo no soportado: ${mediaType}. Use JPG, PNG, WebP o PDF.`,
    };
  }
  const arrayBuffer = await archivo.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  const base64 = buf.toString("base64");

  const r = await extraerTicket(
    base64,
    mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf",
    empresaId,
  );
  if (!r.ok) {
    return { ok: false, error: r.error };
  }
  return {
    ok: true,
    datos: r.data,
    confidence: r.meta.confidence,
  };
}

// =====================================================================
// VIÁTICOS
// =====================================================================

export async function crearViatico(
  _prev: ViaticoState,
  formData: FormData,
): Promise<ViaticoState> {
  const parsed = ViaticoSchema.safeParse({
    empleado_id: formData.get("empleado_id"),
    empresa_id: formData.get("empresa_id"),
    proyecto_id: formData.get("proyecto_id") || undefined,
    fecha_gasto: formData.get("fecha_gasto"),
    concepto: formData.get("concepto"),
    categoria: formData.get("categoria"),
    monto: formData.get("monto"),
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      viaticoId: null,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, viaticoId: null, error: "Sin sesión." };

  const d = parsed.data;

  let ticketUrl: string | null = null;
  const ticket = formData.get("ticket") as File | null;
  if (ticket && ticket.size > 0) {
    if (ticket.size > 5 * 1024 * 1024) {
      return {
        ok: false,
        viaticoId: null,
        error: "Ticket excede 5 MB.",
      };
    }
    const ext = ticket.name.split(".").pop() ?? "bin";
    const path = `${d.empleado_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await supabase.storage
      .from("viaticos")
      .upload(path, ticket, { upsert: true });
    if (!up.error) ticketUrl = path;
  }

  const { data: viatico, error } = await supabase
    .from("viaticos")
    .insert({
      empleado_id: d.empleado_id,
      empresa_id: d.empresa_id,
      proyecto_id: d.proyecto_id,
      fecha_gasto: d.fecha_gasto,
      concepto: d.concepto,
      categoria: d.categoria,
      monto: d.monto,
      observaciones: d.observaciones,
      url_ticket: ticketUrl,
      estado: "pendiente",
      capturado_por: user.id,
    })
    .select("id")
    .single();
  if (error || !viatico) {
    return {
      ok: false,
      viaticoId: null,
      error: error?.message ?? "Error al guardar.",
    };
  }

  const { data: dirs } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id")
    .eq("empresa_id", d.empresa_id)
    .in("rol", ["director", "ceo"])
    .eq("activo", true);
  await crearNotificaciones(
    (dirs ?? [])
      .filter((dir) => dir.usuario_id !== user.id)
      .map((dir) => ({
        usuario_id: dir.usuario_id as string,
        empresa_id: d.empresa_id,
        tipo: "viatico_capturado",
        severidad: "info" as const,
        titulo: "Viático para aprobar",
        mensaje: `${d.concepto} · ${d.monto.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}`,
        url: `/personas/${d.empleado_id}`,
        entidad_tipo: "viatico",
        entidad_id: viatico.id,
      })),
  );

  revalidatePath(`/personas/${d.empleado_id}`);
  return { ok: true, viaticoId: viatico.id, error: null };
}

export async function aprobarViatico(
  viaticoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: vi } = await supabase
    .from("viaticos")
    .select("id, empresa_id, empleado_id, estado")
    .eq("id", viaticoId)
    .maybeSingle();
  if (!vi) return { ok: false, error: "Viático no encontrado." };
  if (vi.estado !== "pendiente") {
    return { ok: false, error: "Ya fue procesado." };
  }
  const v = await obtenerVinculos();
  if (!esCEO(v) && !esRolEn(v, vi.empresa_id, "director")) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("viaticos")
    .update({
      estado: "aprobado",
      aprobado_por: user.id,
      fecha_aprobacion: new Date().toISOString(),
    })
    .eq("id", viaticoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/personas/${vi.empleado_id}`);
  return { ok: true, error: null };
}

export async function rechazarViatico(
  viaticoId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: vi } = await supabase
    .from("viaticos")
    .select("id, empresa_id, empleado_id, estado")
    .eq("id", viaticoId)
    .maybeSingle();
  if (!vi) return { ok: false, error: "No encontrado." };
  if (vi.estado !== "pendiente") {
    return { ok: false, error: "Ya fue procesado." };
  }
  const v = await obtenerVinculos();
  if (!esCEO(v) && !esRolEn(v, vi.empresa_id, "director")) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("viaticos")
    .update({
      estado: "rechazado",
      aprobado_por: user.id,
      fecha_aprobacion: new Date().toISOString(),
      motivo_rechazo: motivo,
    })
    .eq("id", viaticoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/personas/${vi.empleado_id}`);
  return { ok: true, error: null };
}

export async function marcarReembolsado(
  viaticoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: vi } = await supabase
    .from("viaticos")
    .select("id, empresa_id, empleado_id, estado")
    .eq("id", viaticoId)
    .maybeSingle();
  if (!vi) return { ok: false, error: "No encontrado." };
  if (vi.estado !== "aprobado") {
    return { ok: false, error: "Solo aprobados pueden reembolsarse." };
  }
  const v = await obtenerVinculos();
  if (!esCEO(v) && !esRolEn(v, vi.empresa_id, "director")) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("viaticos")
    .update({
      estado: "reembolsado",
      fecha_reembolso: new Date().toISOString().slice(0, 10),
    })
    .eq("id", viaticoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/personas/${vi.empleado_id}`);
  return { ok: true, error: null };
}

// =====================================================================
// DOCUMENTOS DE EMPLEADO
// =====================================================================

export async function subirDocumentoEmpleado(
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const parsed = DocumentoEmpleadoSchema.safeParse({
    empleado_id: formData.get("empleado_id"),
    tipo: formData.get("tipo"),
    fecha_emision: formData.get("fecha_emision") || undefined,
    fecha_vencimiento: formData.get("fecha_vencimiento") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const d = parsed.data;
  const { data: emp } = await supabase
    .from("empleados")
    .select("empresa_id")
    .eq("id", d.empleado_id)
    .maybeSingle();
  if (!emp) return { ok: false, error: "Empleado no encontrado." };

  const v = await obtenerVinculos();
  if (!puedeGestionarEmpleadosEn(v, emp.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }

  const archivo = formData.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) {
    return { ok: false, error: "Falta archivo." };
  }
  if (archivo.size > 10 * 1024 * 1024) {
    return { ok: false, error: "Archivo excede 10 MB." };
  }
  const ext = archivo.name.split(".").pop() ?? "bin";
  const path = `${d.empleado_id}/${d.tipo}-${Date.now()}.${ext}`;
  const up = await supabase.storage
    .from("empleados")
    .upload(path, archivo, { upsert: true });
  if (up.error) {
    return { ok: false, error: up.error.message };
  }

  const { error } = await supabase.from("empleados_documentos").insert({
    empleado_id: d.empleado_id,
    tipo: d.tipo,
    nombre_archivo: archivo.name,
    url_storage: path,
    fecha_emision: d.fecha_emision,
    fecha_vencimiento: d.fecha_vencimiento,
    observaciones: d.observaciones,
    subido_por: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/personas/${d.empleado_id}`);
  return { ok: true, error: null };
}

export async function eliminarDocumentoEmpleado(
  docId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: doc } = await supabase
    .from("empleados_documentos")
    .select("empleado_id, url_storage, empleados(empresa_id)")
    .eq("id", docId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "No encontrado." };

  const empresaId = (doc.empleados as { empresa_id: string } | null)
    ?.empresa_id;
  if (!empresaId) return { ok: false, error: "Empleado no encontrado." };

  const v = await obtenerVinculos();
  if (!puedeGestionarEmpleadosEn(v, empresaId)) {
    return { ok: false, error: "Sin permiso." };
  }
  if (doc.url_storage) {
    await supabase.storage.from("empleados").remove([doc.url_storage]);
  }
  const { error } = await supabase
    .from("empleados_documentos")
    .delete()
    .eq("id", docId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/personas/${doc.empleado_id}`);
  return { ok: true, error: null };
}

// =====================================================================
// REPSE — actualizar vigencia
// =====================================================================

export async function actualizarRepse(
  empleadoId: string,
  vigenciaHasta: string,
  folio: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: emp } = await supabase
    .from("empleados")
    .select("empresa_id, categoria")
    .eq("id", empleadoId)
    .maybeSingle();
  if (!emp) return { ok: false, error: "Empleado no encontrado." };
  if (emp.categoria !== "repse") {
    return {
      ok: false,
      error: "Solo aplica a empleados de categoría REPSE.",
    };
  }
  const v = await obtenerVinculos();
  if (!puedeGestionarEmpleadosEn(v, emp.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("empleados")
    .update({
      vigencia_repse_hasta: vigenciaHasta,
      folio_repse: folio.trim(),
    })
    .eq("id", empleadoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/personas/${empleadoId}`);
  revalidatePath("/personas");
  return { ok: true, error: null };
}
