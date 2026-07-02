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
  conceptosEfectivos,
  OCFormSchema,
  type OCFormData,
} from "@/lib/oc/schemas";
import {
  limitePagoDe,
  UMBRAL_DOBLE_AUTORIZACION,
  type OCState,
} from "@/lib/oc/state";
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
  const modo = formData.get("modo") === "detallado" ? "detallado" : "rapido";
  return {
    modo,
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
    // Contraloría
    empresa_pagadora_id: formData.get("empresa_pagadora_id") || undefined,
    tipo_compra: formData.get("tipo_compra") || undefined,
    cuenta_clave: formData.get("cuenta_clave") || undefined,
    urgencia: formData.get("urgencia") || "cero",
    // Modo rápido
    descripcion_general: formData.get("descripcion_general") || undefined,
    total_directo: formData.get("total_directo") || undefined,
    iva_incluido: formData.get("iva_incluido") === "false" ? "false" : "true",
    conceptos,
  };
}

/**
 * Sube el documento de respaldo (cotización/factura) al bucket `cotizaciones`
 * y devuelve el path. Best-effort: si falla, la OC se crea igual sin adjunto.
 */
async function subirDocumentoOC(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  empresaId: string,
  numero: string,
): Promise<string | null> {
  const file = formData.get("documento");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 10 * 1024 * 1024) return null; // 10 MB máx
  const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "pdf";
  const path = `oc/${empresaId}/${numero.replace(/[^\w-]/g, "_")}.${ext}`;
  const { error } = await supabase.storage
    .from("cotizaciones")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) {
    console.error(`[OC ${numero}] error subiendo documento:`, error.message);
    return null;
  }
  return path;
}

async function generarNumeroOC(
  supabase: ReturnType<typeof createClient>,
  empresaId: string,
): Promise<string> {
  // Reserva atómica vía RPC `siguiente_folio` (advisory lock + UPSERT).
  // Mata el race condition del viejo "select count + 1".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("siguiente_folio", {
    p_empresa_id: empresaId,
    p_tipo: "oc",
  });
  if (error || !data) {
    throw new Error(`No se pudo reservar folio OC: ${error?.message}`);
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

  // Conceptos efectivos: en modo rápido es 1 concepto sintético del total;
  // en detallado son los capturados. Los totales se calculan de ahí.
  const conceptos = conceptosEfectivos(d);
  const totales = calcularTotalesOC({
    conceptos,
    descuento: d.descuento,
    retenciones: d.retenciones,
  });
  const numero = await generarNumeroOC(supabase, d.empresa_id);
  const callerId = await getCallerId(supabase);
  if (!callerId) return { ok: false, error: "No autenticado." };

  // Subir documento de respaldo (cotización/factura) si vino. Best-effort.
  const docPath = await subirDocumentoOC(
    supabase,
    formData,
    d.empresa_id,
    numero,
  );

  // Resolver cuenta contable (clave → id). Si la clave no existe, se ignora
  // (el campo es opcional; no bloquea la captura).
  let cuentaContableId: string | null = null;
  if (d.cuenta_clave) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cta } = await (supabase as any)
      .from("cuentas_contables")
      .select("id")
      .eq("clave", d.cuenta_clave)
      .eq("activo", true)
      .maybeSingle();
    cuentaContableId = cta?.id ?? null;
  }

  // Auto-aprobación: si el capturador tiene umbral suficiente, la OC arranca
  // ya aprobada (evita el round-trip de pasar por "pendiente_aprobacion").
  // Modelo híbrido (regla del contralor): arriba de $100,000 NUNCA se
  // auto-aprueba — siempre pasa por aprobación explícita.
  const autoAprobada =
    puedeAprobarOC(vinculos, d.empresa_id, totales.total) &&
    totales.total <= UMBRAL_DOBLE_AUTORIZACION;
  const ahora = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ocNueva, error: ocErr } = await (supabase as any)
    .from("ordenes_compra")
    .insert({
      empresa_id: d.empresa_id,
      proveedor_id: d.proveedor_id,
      proyecto_id: d.proyecto_id,
      centro_id: d.centro_id,
      // Contraloría: pagadora (default la solicitante), clasificación y SLA.
      empresa_pagadora_id: d.empresa_pagadora_id ?? d.empresa_id,
      cuenta_contable_id: cuentaContableId,
      tipo_compra: d.tipo_compra,
      urgencia: d.urgencia,
      limite_pago: limitePagoDe(d.fecha_emision, d.urgencia),
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
      url_pdf: docPath,
      archivos_adjuntos: docPath
        ? [{ tipo: "documento_origen", path: docPath }]
        : null,
      capturado_por: callerId,
      aprobado_por: autoAprobada ? callerId : null,
      fecha_aprobacion: autoAprobada ? ahora : null,
      auto_aprobada: autoAprobada,
      aprobacion_metodo: autoAprobada ? "auto_umbral" : null,
    })
    .select("id")
    .single();

  if (ocErr || !ocNueva) {
    return { ok: false, error: `Error al crear OC: ${ocErr?.message}` };
  }

  // Insertar conceptos (efectivos: sintético en rápido, reales en detallado).
  const conceptosRows = conceptos.map((c, i) => ({
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

  // Sprint 5.5.3: si la OC quedó autoAprobada y tiene centro, registrar
  // movimiento. Patch 4 (Sprint 1): el error ya no se silencia — la
  // función actualiza `centro_movimiento_error` en la OC y la UI lo
  // mostrará al contralor. La OC SÍ queda creada aunque falle el
  // movimiento (el caller decide reintentar después).
  if (autoAprobada && d.centro_id) {
    const { registrarMovimientoOC } = await import("@/lib/centros/registrar");
    const r = await registrarMovimientoOC(ocNueva.id);
    if (!r.ok) {
      console.error(
        `[OC ${ocNueva.id}] movimiento centro falló:`,
        r.error,
      );
    }
  }

  revalidatePath("/finanzas/oc");
  redirect(`/finanzas/oc/${ocNueva.id}`);
}

// ---------- Acciones de transición de estado ----------

async function gateAccionOC(
  ocId: string,
): Promise<
  | {
      ok: true;
      oc: {
        id: string;
        empresa_id: string;
        estado: string;
        total: number;
        capturado_por: string;
        comentarios: string | null;
      };
    }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const { data: oc } = await supabase
    .from("ordenes_compra")
    .select("id, empresa_id, estado, total, capturado_por, comentarios")
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

  // Atajo: si quien envía a aprobación tiene umbral suficiente, aprobamos
  // directo — salvo que supere el umbral de doble autorización ($100k),
  // donde siempre se exige aprobación explícita (regla del contralor).
  const autoAprobada =
    callerId != null &&
    puedeAprobarOC(v, g.oc.empresa_id, Number(g.oc.total)) &&
    Number(g.oc.total) <= UMBRAL_DOBLE_AUTORIZACION;
  const ahora = new Date().toISOString();
  const update = autoAprobada
    ? {
        estado: "aprobada" as const,
        aprobado_por: callerId,
        fecha_aprobacion: ahora,
        auto_aprobada: true,
        aprobacion_metodo: "auto_umbral",
        updated_at: ahora,
      }
    : {
        estado: "pendiente_aprobacion" as const,
        updated_at: ahora,
      };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ordenes_compra")
    .update({
      estado: "aprobada",
      aprobado_por: callerId,
      fecha_aprobacion: new Date().toISOString(),
      auto_aprobada: false,
      aprobacion_metodo: "manual",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };

  // Sprint 5.5.3: registrar movimiento en centro de costo.
  // Patch 4 (Sprint 1): el error ya no se silencia — queda registrado
  // en `centro_movimiento_error` de la OC para visibilidad/reintento.
  {
    const { registrarMovimientoOC } = await import("@/lib/centros/registrar");
    const rMov = await registrarMovimientoOC(ocId);
    if (!rMov.ok) {
      console.error(`[OC ${ocId}] movimiento centro falló:`, rMov.error);
    }
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
  // S2-T7: motivo de rechazo va a columna dedicada `motivo_rechazo` en vez
  // de sobrescribir `comentarios`. Conserva los comentarios originales.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ordenes_compra")
    .update({
      estado: "cancelada",
      motivo_rechazo: motivo.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/oc/${ocId}`);
  revalidatePath("/finanzas/oc");
  return { ok: true, error: null };
}

/**
 * S2-T5 — Regresar una OC ya aprobada a borrador para corregir.
 *
 * Antes, la única salida si se aprobaba mal era cancelar (pierde el folio).
 * Esta acción permite des-aprobar manteniendo número, sin tocar la
 * trazabilidad: se borran `aprobado_por`, `fecha_aprobacion`,
 * `auto_aprobada` y se regresa estado a `borrador`.
 *
 * También borra el movimiento de centro si lo había, para que el P&L del
 * centro no quede con un gasto fantasma.
 *
 * Permiso: CEO, contralor, o quien tenga umbral suficiente para aprobar
 * esta OC. NO basta con ser el capturador (eso permitiría loops de
 * "auto-aprobar → corregir → auto-aprobar" sin supervisión).
 */
export async function regresarOCABorrador(
  ocId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (!motivo || motivo.trim().length < 5) {
    return {
      ok: false,
      error: "Captura un motivo de regreso (mínimo 5 caracteres).",
    };
  }
  const g = await gateAccionOC(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (g.oc.estado !== "aprobada") {
    return {
      ok: false,
      error: `OC en estado "${g.oc.estado}". Solo se pueden regresar las aprobadas (las recibidas/pagadas requieren cancelar).`,
    };
  }
  const v = await obtenerVinculos();
  if (!puedeAprobarOC(v, g.oc.empresa_id, Number(g.oc.total))) {
    return {
      ok: false,
      error:
        "Solo CEO o un aprobador con umbral suficiente puede regresar una OC aprobada a borrador.",
    };
  }

  const supabase = createClient();
  const callerId = await getCallerId(supabase);
  const ahora = new Date().toISOString();

  // 1) Deshacer movimiento de centro si existe (best-effort).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("centros_movimientos")
    .delete()
    .eq("oc_id", ocId)
    .eq("tipo", "gasto_directo");

  // 2) Reset de campos de aprobación.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ordenes_compra")
    .update({
      estado: "borrador",
      aprobado_por: null,
      fecha_aprobacion: null,
      auto_aprobada: false,
      aprobacion_metodo: null,
      centro_movimiento_registrado_at: null,
      centro_movimiento_error: null,
      comentarios: `REGRESADA A BORRADOR por ${callerId ?? "?"}: ${motivo.trim()}\n---\n${g.oc.comentarios ?? ""}`.slice(0, 5000),
      updated_at: ahora,
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
  // S2-T7: motivo va a columna dedicada en vez de sobrescribir comentarios.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ordenes_compra")
    .update({
      estado: "cancelada",
      motivo_cancelacion: motivo.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/oc/${ocId}`);
  revalidatePath("/finanzas/oc");
  return { ok: true, error: null };
}

/**
 * Marca una OC como enviada al proveedor (aprobada → enviada). Milestone
 * operativo. Permiso: capturador o quien gestiona OC en la empresa.
 */
export async function marcarEnviadaOC(
  ocId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gateAccionOC(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (g.oc.estado !== "aprobada") {
    return {
      ok: false,
      error: `OC en estado "${g.oc.estado}": solo una OC aprobada se puede marcar como enviada.`,
    };
  }
  const supabase = createClient();
  const callerId = await getCallerId(supabase);
  if (callerId !== g.oc.capturado_por) {
    const v = await obtenerVinculos();
    if (!puedeCrearOCEn(v, g.oc.empresa_id)) {
      return { ok: false, error: "Sin permiso para marcar la OC como enviada." };
    }
  }
  const ahora = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ordenes_compra")
    .update({ estado: "enviada", fecha_envio: ahora.slice(0, 10), updated_at: ahora })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/oc/${ocId}`);
  revalidatePath("/finanzas/oc");
  return { ok: true, error: null };
}

/**
 * Marca una OC como pagada (desde aprobada/enviada/parcial_recibida/recibida).
 * El pago real se concilia con el CFDI ligado (cfdi.oc_id); esto registra el
 * milestone + la fecha de pago. Permiso: capturador o gestor de OC.
 */
export async function marcarPagadaOC(
  ocId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gateAccionOC(ocId);
  if (!g.ok) return { ok: false, error: g.error };
  if (
    !["aprobada", "enviada", "parcial_recibida", "recibida"].includes(g.oc.estado)
  ) {
    return {
      ok: false,
      error: `OC en estado "${g.oc.estado}": no se puede marcar como pagada.`,
    };
  }
  const supabase = createClient();
  const callerId = await getCallerId(supabase);
  if (callerId !== g.oc.capturado_por) {
    const v = await obtenerVinculos();
    if (!puedeCrearOCEn(v, g.oc.empresa_id)) {
      return { ok: false, error: "Sin permiso para marcar la OC como pagada." };
    }
  }
  const ahora = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("ordenes_compra")
    .update({ estado: "pagada", fecha_pago: ahora.slice(0, 10), updated_at: ahora })
    .eq("id", ocId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/oc/${ocId}`);
  revalidatePath("/finanzas/oc");
  return { ok: true, error: null };
}
