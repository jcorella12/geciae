"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  obtenerVinculos,
  puedeAprobarOC,
  puedeCrearOCEn,
} from "@/lib/auth/permisos";
import {
  calcularTotalesOC,
  OCFormSchema,
  type OCFormData,
} from "@/lib/oc/schemas";
import type { OCState } from "@/lib/oc/state";
import { createClient } from "@/lib/supabase/server";

function parseFormData(formData: FormData): unknown {
  const conceptosRaw = formData.get("conceptos");
  let conceptos: unknown = [];
  if (typeof conceptosRaw === "string" && conceptosRaw.trim()) {
    try {
      conceptos = JSON.parse(conceptosRaw);
    } catch {
      conceptos = [];
    }
  }
  return {
    empresa_id: formData.get("empresa_id"),
    proveedor_id: formData.get("proveedor_id"),
    proyecto_id: formData.get("proyecto_id") || undefined,
    fecha_emision: formData.get("fecha_emision"),
    fecha_entrega_esperada: formData.get("fecha_entrega_esperada") || undefined,
    condiciones_pago: formData.get("condiciones_pago") || undefined,
    forma_pago: formData.get("forma_pago") || undefined,
    comentarios: formData.get("comentarios") || undefined,
    descuento: formData.get("descuento") || 0,
    retenciones: formData.get("retenciones") || 0,
    centro_id: formData.get("centro_id") || undefined,
    conceptos,
  };
}

async function generarNumeroOC(
  supabase: ReturnType<typeof createClient>,
  empresaId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("ordenes_compra")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", empresaId)
    .gte("fecha_emision", `${year}-01-01`);
  const next = (count ?? 0) + 1;
  return `OC-${year}-${String(next).padStart(4, "0")}`;
}

async function getCallerId(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createOC(
  _prev: OCState,
  formData: FormData,
): Promise<OCState> {
  const parsed = OCFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data as OCFormData;

  const vinculos = await obtenerVinculos();
  if (!puedeCrearOCEn(vinculos, d.empresa_id)) {
    return {
      ok: false,
      error: "No tienes permiso para crear OC en esta empresa.",
    };
  }

  const supabase = createClient();

  // Bloqueo por semáforo de proveedor.
  const { data: prov } = await supabase
    .from("proveedores")
    .select("id, razon_social, semaforo, activo")
    .eq("id", d.proveedor_id)
    .maybeSingle();
  if (!prov) return { ok: false, error: "Proveedor no encontrado." };
  if (prov.activo === false) {
    return { ok: false, error: "El proveedor está inactivo." };
  }
  if (prov.semaforo === "rojo" || prov.semaforo === "negro") {
    return {
      ok: false,
      error: `Proveedor "${prov.razon_social}" en semáforo ${prov.semaforo}. No se puede crear OC hasta regularizar su cumplimiento.`,
    };
  }

  const totales = calcularTotalesOC(d);
  const numero = await generarNumeroOC(supabase, d.empresa_id);
  const callerId = await getCallerId(supabase);
  if (!callerId) return { ok: false, error: "No autenticado." };

  // Auto-aprobación: si el capturador tiene umbral suficiente, la OC arranca
  // ya aprobada (evita el round-trip de pasar por "pendiente_aprobacion").
  const autoAprobada = puedeAprobarOC(vinculos, d.empresa_id, totales.total);
  const ahora = new Date().toISOString();

  const { data: ocNueva, error: ocErr } = await supabase
    .from("ordenes_compra")
    .insert({
      empresa_id: d.empresa_id,
      proveedor_id: d.proveedor_id,
      proyecto_id: d.proyecto_id,
      centro_id: d.centro_id,
      numero,
      fecha_emision: d.fecha_emision,
      fecha_entrega_esperada: d.fecha_entrega_esperada,
      subtotal: totales.subtotal,
      descuento: totales.descuento,
      iva: totales.iva,
      retenciones: totales.retenciones,
      total: totales.total,
      condiciones_pago: d.condiciones_pago,
      forma_pago: d.forma_pago,
      estado: autoAprobada ? "aprobada" : "borrador",
      comentarios: d.comentarios,
      capturado_por: callerId,
      aprobado_por: autoAprobada ? callerId : null,
      fecha_aprobacion: autoAprobada ? ahora : null,
    })
    .select("id")
    .single();

  if (ocErr || !ocNueva) {
    return { ok: false, error: `Error al crear OC: ${ocErr?.message}` };
  }

  // Insertar conceptos.
  const conceptosRows = d.conceptos.map((c, i) => ({
    oc_id: ocNueva.id,
    orden: i + 1,
    descripcion: c.descripcion,
    cantidad: c.cantidad,
    unidad_sat: c.unidad_sat,
    precio_unitario: c.precio_unitario,
    importe: Math.round(c.cantidad * c.precio_unitario * 100) / 100,
    iva_tasa: c.iva_tasa,
    clave_sat: c.clave_sat,
  }));
  const { error: cErr } = await supabase
    .from("ordenes_compra_conceptos")
    .insert(conceptosRows);
  if (cErr) {
    // Compensar: borrar la OC.
    await supabase.from("ordenes_compra").delete().eq("id", ocNueva.id);
    return { ok: false, error: `Error al guardar conceptos: ${cErr.message}` };
  }

  // Sprint 4.3: si la OC se crea desde una solicitud, vincular bi-direccionalmente
  // y marcar la solicitud como ejecutada.
  const solicitudOrigen = formData.get("solicitud_origen") as string | null;
  if (solicitudOrigen) {
    try {
      const { vincularEntidadASolicitud } = await import(
        "@/app/(app)/proyectos/[id]/solicitudes/actions"
      );
      await vincularEntidadASolicitud(
        solicitudOrigen,
        "oc_id",
        ocNueva.id,
        true,
      );
    } catch {
      // Best-effort: si falla la vinculación no abortamos la OC ya creada.
    }
  }

  // Sprint 5.5.3: si la OC quedó autoAprobada y tiene centro, registrar movimiento
  if (autoAprobada && d.centro_id) {
    try {
      const { registrarMovimientoOC } = await import("@/lib/centros/registrar");
      await registrarMovimientoOC(ocNueva.id);
    } catch {
      // Best-effort
    }
  }

  revalidatePath("/finanzas/oc");
  redirect(`/finanzas/oc/${ocNueva.id}`);
}

// ---------- Acciones de transición de estado ----------

async function gateAccionOC(
  ocId: string,
): Promise<{ ok: true; oc: { id: string; empresa_id: string; estado: string; total: number; capturado_por: string } } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: oc } = await supabase
    .from("ordenes_compra")
    .select("id, empresa_id, estado, total, capturado_por")
    .eq("id", ocId)
    .maybeSingle();
  if (!oc) return { ok: false, error: "OC no encontrada." };
  return { ok: true, oc: oc as never };
}

export async function enviarAAprobacion(
  ocId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gateAccionOC(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (g.oc.estado !== "borrador") {
    return { ok: false, error: `OC en estado "${g.oc.estado}", no se puede enviar.` };
  }
  const supabase = createClient();
  const callerId = await getCallerId(supabase);
  const v = await obtenerVinculos();
  if (callerId !== g.oc.capturado_por) {
    if (!puedeCrearOCEn(v, g.oc.empresa_id)) {
      return { ok: false, error: "Solo el capturador o un admin puede enviar a aprobación." };
    }
  }

  // Atajo: si quien envía a aprobación tiene umbral suficiente, aprobamos directo.
  const autoAprobada =
    callerId != null &&
    puedeAprobarOC(v, g.oc.empresa_id, Number(g.oc.total));
  const ahora = new Date().toISOString();
  const update = autoAprobada
    ? {
        estado: "aprobada" as const,
        aprobado_por: callerId,
        fecha_aprobacion: ahora,
        updated_at: ahora,
      }
    : {
        estado: "pendiente_aprobacion" as const,
        updated_at: ahora,
      };

  const { error } = await supabase
    .from("ordenes_compra")
    .update(update)
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/oc/${ocId}`);
  revalidatePath("/finanzas/oc");
  return { ok: true, error: null };
}

export async function aprobarOC(
  ocId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gateAccionOC(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (g.oc.estado !== "pendiente_aprobacion") {
    return { ok: false, error: `OC en estado "${g.oc.estado}", no es aprobable.` };
  }
  const v = await obtenerVinculos();
  if (!puedeAprobarOC(v, g.oc.empresa_id, Number(g.oc.total))) {
    return {
      ok: false,
      error: `Tu umbral no cubre $${Number(g.oc.total).toLocaleString("es-MX")} MXN. Escala a un aprobador con umbral mayor o al CEO.`,
    };
  }
  const supabase = createClient();
  const callerId = await getCallerId(supabase);
  const { error } = await supabase
    .from("ordenes_compra")
    .update({
      estado: "aprobada",
      aprobado_por: callerId,
      fecha_aprobacion: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };

  // Sprint 5.5.3: registrar movimiento en centro de costo (best-effort)
  try {
    const { registrarMovimientoOC } = await import("@/lib/centros/registrar");
    await registrarMovimientoOC(ocId);
  } catch {
    // ignore
  }

  revalidatePath(`/finanzas/oc/${ocId}`);
  revalidatePath("/finanzas/oc");
  return { ok: true, error: null };
}

export async function rechazarOC(
  ocId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (!motivo || motivo.trim().length < 5) {
    return { ok: false, error: "Captura un motivo de rechazo de al menos 5 caracteres." };
  }
  const g = await gateAccionOC(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (!["pendiente_aprobacion", "borrador"].includes(g.oc.estado)) {
    return { ok: false, error: `OC en estado "${g.oc.estado}", no se puede rechazar.` };
  }
  const v = await obtenerVinculos();
  if (!puedeAprobarOC(v, g.oc.empresa_id, Number(g.oc.total))) {
    return {
      ok: false,
      error: "No tienes umbral para decidir sobre este monto.",
    };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("ordenes_compra")
    .update({
      estado: "cancelada",
      comentarios: `RECHAZADA: ${motivo.trim()}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/oc/${ocId}`);
  revalidatePath("/finanzas/oc");
  return { ok: true, error: null };
}

export async function cancelarOC(
  ocId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (!motivo || motivo.trim().length < 5) {
    return { ok: false, error: "Captura un motivo de cancelación." };
  }
  const g = await gateAccionOC(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (g.oc.estado === "pagada" || g.oc.estado === "cancelada") {
    return { ok: false, error: `OC ya está ${g.oc.estado}, no se puede cancelar.` };
  }
  const supabase = createClient();
  const callerId = await getCallerId(supabase);
  if (callerId !== g.oc.capturado_por) {
    const v = await obtenerVinculos();
    if (!puedeAprobarOC(v, g.oc.empresa_id, Number(g.oc.total))) {
      return {
        ok: false,
        error: "Solo el capturador o un aprobador con umbral puede cancelar.",
      };
    }
  }
  const { error } = await supabase
    .from("ordenes_compra")
    .update({
      estado: "cancelada",
      comentarios: `CANCELADA: ${motivo.trim()}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/oc/${ocId}`);
  revalidatePath("/finanzas/oc");
  return { ok: true, error: null };
}
