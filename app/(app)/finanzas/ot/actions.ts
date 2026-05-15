"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  empresasDondeCreaOC,
  obtenerVinculos,
  puedeAprobarOT,
  puedeCrearOCEn,
} from "@/lib/auth/permisos";
import { crearNotificaciones } from "@/lib/notificaciones/emisor";
import { calcularTotalesOT, OTFormSchema } from "@/lib/ot/schemas";
import type { OTState } from "@/lib/ot/state";
import { createClient } from "@/lib/supabase/server";

function parseFormData(formData: FormData) {
  return {
    empresa_origen_id: formData.get("empresa_origen_id"),
    empresa_destino_id: formData.get("empresa_destino_id"),
    proyecto_id: formData.get("proyecto_id") || undefined,
    servicio_id: formData.get("servicio_id") || undefined,
    descripcion: formData.get("descripcion"),
    fecha_solicitud: formData.get("fecha_solicitud"),
    fecha_completacion_esperada:
      formData.get("fecha_completacion_esperada") || undefined,
    cantidad: formData.get("cantidad") || 1,
    unidad: formData.get("unidad") || undefined,
    costo_base: formData.get("costo_base"),
    margen_aplicado: formData.get("margen_aplicado") || 0.15,
    iva_tasa: formData.get("iva_tasa") || 0.16,
    retenciones: formData.get("retenciones") || 0,
    observaciones: formData.get("observaciones") || undefined,
    centro_origen_id: formData.get("centro_origen_id") || undefined,
    centro_destino_id: formData.get("centro_destino_id") || undefined,
  };
}

async function generarNumeroOT(
  supabase: ReturnType<typeof createClient>,
  empresaOrigenId: string,
): Promise<string> {
  // Reserva atómica vía RPC `siguiente_folio` (advisory lock + UPSERT).
  // Mata el race condition del viejo "select count + 1".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("siguiente_folio", {
    p_empresa_id: empresaOrigenId,
    p_tipo: "ot",
  });
  if (error || !data) {
    throw new Error(`No se pudo reservar folio OT: ${error?.message}`);
  }
  return data as string;
}

async function getCallerId(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createOT(
  _prev: OTState,
  formData: FormData,
): Promise<OTState> {
  const parsed = OTFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;

  const v = await obtenerVinculos();
  if (!puedeCrearOCEn(v, d.empresa_origen_id)) {
    return {
      ok: false,
      error: "Sin permiso para crear OT en la empresa origen.",
    };
  }

  const totales = calcularTotalesOT(d);
  const supabase = createClient();
  const numero = await generarNumeroOT(supabase, d.empresa_origen_id);
  const callerId = await getCallerId(supabase);
  if (!callerId) return { ok: false, error: "No autenticado." };

  const { data: nueva, error: insErr } = await supabase
    .from("ordenes_trabajo_inter_co")
    .insert({
      empresa_origen_id: d.empresa_origen_id,
      empresa_destino_id: d.empresa_destino_id,
      proyecto_id: d.proyecto_id,
      servicio_id: d.servicio_id,
      numero,
      descripcion: d.descripcion,
      fecha_solicitud: d.fecha_solicitud,
      fecha_completacion_esperada: d.fecha_completacion_esperada,
      cantidad: d.cantidad,
      unidad: d.unidad,
      costo_base: totales.subtotal,
      margen_aplicado: d.margen_aplicado,
      precio_inter_co: totales.precio_inter_co,
      iva: totales.iva,
      retenciones: totales.retenciones,
      total: totales.total,
      estado: "solicitada",
      observaciones: d.observaciones,
      capturado_por: callerId,
      centro_origen_id: d.centro_origen_id ?? null,
      centro_destino_id: d.centro_destino_id ?? null,
    })
    .select("id")
    .single();

  if (insErr || !nueva) {
    return { ok: false, error: insErr?.message ?? "Error al crear OT." };
  }

  // Notificar a aprobadores de empresa destino para que confirmen.
  const { data: aprobadoresDestino } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id")
    .eq("empresa_id", d.empresa_destino_id)
    .in("rol", ["ceo", "director"])
    .eq("activo", true);

  if (aprobadoresDestino && aprobadoresDestino.length > 0) {
    await crearNotificaciones(
      aprobadoresDestino
        .map((a) => a.usuario_id)
        .filter((id): id is string => Boolean(id))
        .map((usuarioId) => ({
          usuario_id: usuarioId,
          empresa_id: d.empresa_destino_id,
          tipo: "ot_pendiente_confirmacion",
          severidad: "warning" as const,
          titulo: `OT ${numero} pendiente de tu confirmación`,
          mensaje: `Tu empresa fue seleccionada como destino. Total estimado $${totales.total.toLocaleString("es-MX")} MXN.`,
          url: `/finanzas/ot/${nueva.id}`,
          entidad_tipo: "ot_inter_co",
          entidad_id: nueva.id,
        })),
    );
  }

  // Sprint 4.3: si la OT se crea desde una solicitud, vincular y marcar
  // la solicitud como ejecutada.
  const solicitudOrigen = formData.get("solicitud_origen") as string | null;
  if (solicitudOrigen) {
    try {
      const { vincularEntidadASolicitud } = await import(
        "@/app/(app)/proyectos/[id]/solicitudes/actions"
      );
      await vincularEntidadASolicitud(
        solicitudOrigen,
        "ot_id",
        nueva.id,
        true,
      );
    } catch {
      // Best-effort
    }
  }

  revalidatePath("/finanzas/ot");
  redirect(`/finanzas/ot/${nueva.id}`);
}

// ----------------------------------------------------------------------------
// Workflow actions
// ----------------------------------------------------------------------------

type GateOTOk = {
  ok: true;
  oc: {
    id: string;
    empresa_origen_id: string;
    empresa_destino_id: string;
    estado: string;
    capturado_por: string;
    aprobado_origen_por: string | null;
    aprobado_destino_por: string | null;
    total: number;
    numero: string;
  };
};

async function gateOT(
  ocId: string,
): Promise<GateOTOk | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: ot } = await supabase
    .from("ordenes_trabajo_inter_co")
    .select(
      "id, empresa_origen_id, empresa_destino_id, estado, capturado_por, aprobado_origen_por, aprobado_destino_por, total, numero",
    )
    .eq("id", ocId)
    .maybeSingle();
  if (!ot) return { ok: false, error: "OT no encontrada." };
  return { ok: true, oc: ot as never };
}

function esCEODirOperEnEmpresa(
  vinculos: Awaited<ReturnType<typeof obtenerVinculos>>,
  empresaId: string,
) {
  return vinculos.some(
    (v) =>
      v.empresa_id === empresaId &&
      ["ceo", "director", "operativo"].includes(v.rol),
  );
}

/**
 * Aprueba la OT por el lado de la empresa origen (quien paga).
 * Si ya estaba confirmada por destino, la OT pasa a "aprobada".
 */
export async function confirmarOTOrigen(
  ocId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gateOT(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (g.oc.estado !== "solicitada") {
    return {
      ok: false,
      error: `OT en estado "${g.oc.estado}", no se puede confirmar origen.`,
    };
  }
  const v = await obtenerVinculos();
  if (!esCEODirOperEnEmpresa(v, g.oc.empresa_origen_id)) {
    return {
      ok: false,
      error: "Solo CEO/Director/Operativo de la empresa origen puede confirmar.",
    };
  }
  const supabase = createClient();
  const callerId = await getCallerId(supabase);
  const ahora = new Date().toISOString();
  const ambasFirmadas = g.oc.aprobado_destino_por != null;

  const { error } = await supabase
    .from("ordenes_trabajo_inter_co")
    .update({
      aprobado_origen_por: callerId,
      ...(ambasFirmadas
        ? { estado: "aprobada" as const }
        : {}),
      updated_at: ahora,
    })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };

  // Si esto cierra el ciclo de doble confirmación, notificar capturador.
  if (ambasFirmadas && g.oc.capturado_por && g.oc.capturado_por !== callerId) {
    await crearNotificaciones([
      {
        usuario_id: g.oc.capturado_por,
        empresa_id: g.oc.empresa_origen_id,
        tipo: "ot_aprobada",
        severidad: "success",
        titulo: `OT ${g.oc.numero} aprobada por ambas empresas`,
        mensaje: `Lista para iniciar trabajo. Total $${Number(g.oc.total).toLocaleString("es-MX")} MXN.`,
        url: `/finanzas/ot/${ocId}`,
        entidad_tipo: "ot_inter_co",
        entidad_id: ocId,
      },
    ]);
  }

  revalidatePath(`/finanzas/ot/${ocId}`);
  revalidatePath("/finanzas/ot");
  return { ok: true, error: null };
}

export async function confirmarOTDestino(
  ocId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gateOT(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (g.oc.estado !== "solicitada") {
    return {
      ok: false,
      error: `OT en estado "${g.oc.estado}", no se puede confirmar destino.`,
    };
  }
  const v = await obtenerVinculos();
  if (!esCEODirOperEnEmpresa(v, g.oc.empresa_destino_id)) {
    return {
      ok: false,
      error: "Solo CEO/Director/Operativo de la empresa destino puede confirmar.",
    };
  }
  const supabase = createClient();
  const callerId = await getCallerId(supabase);
  const ahora = new Date().toISOString();
  const ambasFirmadas = g.oc.aprobado_origen_por != null;

  const { error } = await supabase
    .from("ordenes_trabajo_inter_co")
    .update({
      aprobado_destino_por: callerId,
      ...(ambasFirmadas
        ? { estado: "aprobada" as const }
        : {}),
      updated_at: ahora,
    })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };

  if (ambasFirmadas && g.oc.capturado_por && g.oc.capturado_por !== callerId) {
    await crearNotificaciones([
      {
        usuario_id: g.oc.capturado_por,
        empresa_id: g.oc.empresa_origen_id,
        tipo: "ot_aprobada",
        severidad: "success",
        titulo: `OT ${g.oc.numero} aprobada por ambas empresas`,
        mensaje: `Lista para iniciar trabajo. Total $${Number(g.oc.total).toLocaleString("es-MX")} MXN.`,
        url: `/finanzas/ot/${ocId}`,
        entidad_tipo: "ot_inter_co",
        entidad_id: ocId,
      },
    ]);
  }

  revalidatePath(`/finanzas/ot/${ocId}`);
  revalidatePath("/finanzas/ot");
  return { ok: true, error: null };
}

export async function iniciarTrabajoOT(
  ocId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gateOT(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (g.oc.estado !== "aprobada") {
    return {
      ok: false,
      error: `OT en estado "${g.oc.estado}", no se puede iniciar.`,
    };
  }
  const v = await obtenerVinculos();
  if (!esCEODirOperEnEmpresa(v, g.oc.empresa_destino_id)) {
    return {
      ok: false,
      error: "Solo la empresa que presta el servicio puede iniciar el trabajo.",
    };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("ordenes_trabajo_inter_co")
    .update({ estado: "en_proceso", updated_at: new Date().toISOString() })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/ot/${ocId}`);
  revalidatePath("/finanzas/ot");
  return { ok: true, error: null };
}

export async function marcarCompletadaOT(
  ocId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gateOT(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (!["aprobada", "en_proceso"].includes(g.oc.estado)) {
    return {
      ok: false,
      error: `OT en estado "${g.oc.estado}", no se puede marcar completada.`,
    };
  }
  const v = await obtenerVinculos();
  if (!esCEODirOperEnEmpresa(v, g.oc.empresa_destino_id)) {
    return {
      ok: false,
      error: "Solo la empresa que prestó el servicio puede marcar completada.",
    };
  }
  const supabase = createClient();
  const callerId = await getCallerId(supabase);
  const { error } = await supabase
    .from("ordenes_trabajo_inter_co")
    .update({
      estado: "completada_origen",
      fecha_completacion_real: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };

  // Notificar capturador y aprobadores de empresa origen para que confirmen.
  const { data: contactos } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id")
    .eq("empresa_id", g.oc.empresa_origen_id)
    .in("rol", ["ceo", "director"])
    .eq("activo", true);

  const ids = new Set<string>();
  if (g.oc.capturado_por) ids.add(g.oc.capturado_por);
  for (const c of contactos ?? []) if (c.usuario_id) ids.add(c.usuario_id);
  ids.delete(callerId ?? "");

  if (ids.size > 0) {
    await crearNotificaciones(
      Array.from(ids).map((usuarioId) => ({
        usuario_id: usuarioId,
        empresa_id: g.oc.empresa_origen_id,
        tipo: "ot_completada_pendiente_confirmar",
        severidad: "info",
        titulo: `OT ${g.oc.numero} marcada como completada`,
        mensaje: "Confirma que recibiste el servicio para cerrar.",
        url: `/finanzas/ot/${ocId}`,
        entidad_tipo: "ot_inter_co",
        entidad_id: ocId,
      })),
    );
  }

  revalidatePath(`/finanzas/ot/${ocId}`);
  revalidatePath("/finanzas/ot");
  return { ok: true, error: null };
}

export async function confirmarRecibidoOT(
  ocId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gateOT(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (g.oc.estado !== "completada_origen") {
    return {
      ok: false,
      error: `OT en estado "${g.oc.estado}", no se puede confirmar recibido.`,
    };
  }
  const v = await obtenerVinculos();
  if (!esCEODirOperEnEmpresa(v, g.oc.empresa_origen_id)) {
    return {
      ok: false,
      error: "Solo la empresa origen (que paga) puede confirmar recibido.",
    };
  }
  // Validación de umbral aprobador para el monto.
  if (!puedeAprobarOT(v, g.oc.empresa_origen_id, Number(g.oc.total))) {
    // Permitir si es operativo capturador, pero si no, escalar.
    const callerId = await getCallerId(createClient());
    if (callerId !== g.oc.capturado_por) {
      return {
        ok: false,
        error: "Tu umbral no cubre este monto. Escala a un aprobador.",
      };
    }
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("ordenes_trabajo_inter_co")
    .update({
      estado: "confirmada_destino",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/ot/${ocId}`);
  revalidatePath("/finanzas/ot");
  return { ok: true, error: null };
}

export async function cancelarOT(
  ocId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (!motivo || motivo.trim().length < 5) {
    return { ok: false, error: "Motivo requerido (al menos 5 caracteres)." };
  }
  const g = await gateOT(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (["facturada", "cobrada", "cancelada"].includes(g.oc.estado)) {
    return { ok: false, error: `OT en estado "${g.oc.estado}", no se puede cancelar.` };
  }
  const v = await obtenerVinculos();
  if (
    !esCEODirOperEnEmpresa(v, g.oc.empresa_origen_id) &&
    !esCEODirOperEnEmpresa(v, g.oc.empresa_destino_id)
  ) {
    return { ok: false, error: "Sin permiso." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("ordenes_trabajo_inter_co")
    .update({
      estado: "cancelada",
      observaciones: `CANCELADA: ${motivo.trim()}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/ot/${ocId}`);
  revalidatePath("/finanzas/ot");
  return { ok: true, error: null };
}

// Mantener referencia para otros bloques
export { empresasDondeCreaOC };
