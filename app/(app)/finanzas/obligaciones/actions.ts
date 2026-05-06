"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  ActualizarFechaSchema,
  ActualizarObservacionesSchema,
  GenerarAnualesSchema,
  MarcarNoAplicaSchema,
  MarcarPagadaSchema,
  MarcarPresentadaSchema,
  MarcarRechazadaSchema,
  RevertirEstadoSchema,
} from "@/lib/obligaciones/schemas";
import {
  initialGenerarAnualesState,
  initialObligacionState,
  initialSimpleState,
  type GenerarAnualesState,
  type ObligacionState,
  type SimpleState,
} from "@/lib/obligaciones/state";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "obligaciones-sat";

/**
 * Gate de permisos para actuar sobre una obligación SAT.
 *
 * Permitido:
 *  - CEO global
 *  - Tesorero/contralor corporativo (tieneAtributo "tesorero_corporativo" o
 *    "aprobador_financiero")
 *  - Director de la empresa dueña de la obligación
 *  - Operativo de la empresa (admin del despacho contable)
 */
async function gateObligacion(
  obligacionId: string,
): Promise<
  | { ok: true; empresaId: string; obligacion: { fecha_vencimiento: string } }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const { data: o } = await supabase
    .from("obligaciones_sat")
    .select("empresa_id, fecha_vencimiento")
    .eq("id", obligacionId)
    .maybeSingle();
  if (!o)
    return { ok: false, error: "Obligación no encontrada." };
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    tieneAtributo(v, "aprobador_financiero") ||
    esRolEn(v, o.empresa_id, ["director", "operativo"]);
  if (!puede)
    return { ok: false, error: "Sin permiso para gestionar esta obligación." };
  return {
    ok: true,
    empresaId: o.empresa_id,
    obligacion: { fecha_vencimiento: o.fecha_vencimiento },
  };
}

/** Solo CEO o tesorero corporativo pueden revertir un estado terminal. */
async function gateRevertir(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const v = await obtenerVinculos();
  const puede = esCEO(v) || tieneAtributo(v, "tesorero_corporativo");
  if (!puede)
    return {
      ok: false,
      error:
        "Solo CEO o tesorero corporativo pueden revertir obligaciones terminales.",
    };
  return { ok: true };
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

// ============================================================================
// 1. Marcar presentada
// ============================================================================
export async function marcarPresentada(
  _prev: ObligacionState,
  formData: FormData,
): Promise<ObligacionState> {
  const parsed = MarcarPresentadaSchema.safeParse({
    obligacion_id: formData.get("obligacion_id"),
    numero_operacion: formData.get("numero_operacion") ?? "",
    monto_calculado: formData.get("monto_calculado") || null,
    fecha_presentacion: formData.get("fecha_presentacion"),
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success) {
    return {
      ...initialObligacionState,
      error: "Revisa los campos.",
      fieldErrors: flatErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const g = await gateObligacion(d.obligacion_id);
  if (!g.ok) return { ...initialObligacionState, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("obligaciones_sat")
    .update({
      estado: "presentada",
      fecha_presentacion: d.fecha_presentacion,
      numero_operacion: d.numero_operacion,
      monto_calculado: d.monto_calculado ?? null,
      observaciones: d.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.obligacion_id);
  if (error)
    return { ...initialObligacionState, error: error.message };
  revalidatePath(`/finanzas/obligaciones/${d.obligacion_id}`);
  revalidatePath("/finanzas/obligaciones");
  return { ok: true, error: null };
}

// ============================================================================
// 2. Marcar pagada
// ============================================================================
export async function marcarPagada(
  _prev: ObligacionState,
  formData: FormData,
): Promise<ObligacionState> {
  const parsed = MarcarPagadaSchema.safeParse({
    obligacion_id: formData.get("obligacion_id"),
    monto_pagado: formData.get("monto_pagado"),
    fecha_pago: formData.get("fecha_pago"),
    saldo_a_favor: formData.get("saldo_a_favor") || null,
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success) {
    return {
      ...initialObligacionState,
      error: "Revisa los campos.",
      fieldErrors: flatErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const g = await gateObligacion(d.obligacion_id);
  if (!g.ok) return { ...initialObligacionState, error: g.error };

  // Verificar estado actual: solo se puede pagar si está presentada o en_proceso
  const supabase = createClient();
  const { data: actual } = await supabase
    .from("obligaciones_sat")
    .select("estado")
    .eq("id", d.obligacion_id)
    .maybeSingle();
  if (!actual)
    return { ...initialObligacionState, error: "Obligación no encontrada." };
  if (!["presentada", "en_proceso"].includes(actual.estado as string)) {
    return {
      ...initialObligacionState,
      error:
        "Solo puedes marcar como pagada una obligación 'presentada' o 'en proceso'. Marca como presentada primero.",
    };
  }

  const { error } = await supabase
    .from("obligaciones_sat")
    .update({
      estado: "pagada",
      fecha_pago: d.fecha_pago,
      monto_pagado: d.monto_pagado,
      saldo_a_favor: d.saldo_a_favor ?? null,
      observaciones: d.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.obligacion_id);
  if (error)
    return { ...initialObligacionState, error: error.message };
  revalidatePath(`/finanzas/obligaciones/${d.obligacion_id}`);
  revalidatePath("/finanzas/obligaciones");
  return { ok: true, error: null };
}

// ============================================================================
// 3. Marcar no aplica
// ============================================================================
export async function marcarNoAplica(
  _prev: ObligacionState,
  formData: FormData,
): Promise<ObligacionState> {
  const parsed = MarcarNoAplicaSchema.safeParse({
    obligacion_id: formData.get("obligacion_id"),
    observaciones: formData.get("observaciones"),
  });
  if (!parsed.success) {
    return {
      ...initialObligacionState,
      error: "Revisa los campos.",
      fieldErrors: flatErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const g = await gateObligacion(d.obligacion_id);
  if (!g.ok) return { ...initialObligacionState, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("obligaciones_sat")
    .update({
      estado: "no_aplica",
      observaciones: d.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.obligacion_id);
  if (error)
    return { ...initialObligacionState, error: error.message };
  revalidatePath(`/finanzas/obligaciones/${d.obligacion_id}`);
  revalidatePath("/finanzas/obligaciones");
  return { ok: true, error: null };
}

// ============================================================================
// 4. Marcar rechazada
// ============================================================================
export async function marcarRechazada(
  _prev: ObligacionState,
  formData: FormData,
): Promise<ObligacionState> {
  const parsed = MarcarRechazadaSchema.safeParse({
    obligacion_id: formData.get("obligacion_id"),
    observaciones: formData.get("observaciones"),
  });
  if (!parsed.success) {
    return {
      ...initialObligacionState,
      error: "Revisa los campos.",
      fieldErrors: flatErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const g = await gateObligacion(d.obligacion_id);
  if (!g.ok) return { ...initialObligacionState, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("obligaciones_sat")
    .update({
      estado: "rechazada",
      observaciones: d.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.obligacion_id);
  if (error)
    return { ...initialObligacionState, error: error.message };
  revalidatePath(`/finanzas/obligaciones/${d.obligacion_id}`);
  revalidatePath("/finanzas/obligaciones");
  return { ok: true, error: null };
}

// ============================================================================
// 5. Actualizar observaciones (sin cambiar estado)
// ============================================================================
export async function actualizarObservaciones(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const parsed = ActualizarObservacionesSchema.safeParse({
    obligacion_id: formData.get("obligacion_id"),
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success)
    return { ...initialSimpleState, error: "Texto inválido." };
  const d = parsed.data;
  const g = await gateObligacion(d.obligacion_id);
  if (!g.ok) return { ...initialSimpleState, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("obligaciones_sat")
    .update({
      observaciones: d.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.obligacion_id);
  if (error) return { ...initialSimpleState, error: error.message };
  revalidatePath(`/finanzas/obligaciones/${d.obligacion_id}`);
  return { ok: true, error: null };
}

// ============================================================================
// 6. Actualizar fecha vencimiento
// ============================================================================
export async function actualizarFechaVencimiento(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const parsed = ActualizarFechaSchema.safeParse({
    obligacion_id: formData.get("obligacion_id"),
    fecha_vencimiento: formData.get("fecha_vencimiento"),
  });
  if (!parsed.success)
    return { ...initialSimpleState, error: "Fecha inválida." };
  const d = parsed.data;
  const g = await gateObligacion(d.obligacion_id);
  if (!g.ok) return { ...initialSimpleState, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("obligaciones_sat")
    .update({
      fecha_vencimiento: d.fecha_vencimiento,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.obligacion_id);
  if (error) return { ...initialSimpleState, error: error.message };
  revalidatePath(`/finanzas/obligaciones/${d.obligacion_id}`);
  revalidatePath("/finanzas/obligaciones");
  return { ok: true, error: null };
}

// ============================================================================
// 7. Subir acuse / 8. Subir comprobante
// ============================================================================
async function subirArchivo(
  obligacionId: string,
  file: File,
  kind: "acuse" | "comprobante",
): Promise<SimpleState> {
  if (!file || file.size === 0)
    return { ...initialSimpleState, error: "Selecciona un archivo." };
  if (file.size > 25 * 1024 * 1024)
    return { ...initialSimpleState, error: "Archivo > 25MB." };
  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  if (kind === "acuse" && file.type !== "application/pdf")
    return { ...initialSimpleState, error: "El acuse debe ser PDF." };
  if (kind === "comprobante" && !allowed.includes(file.type))
    return { ...initialSimpleState, error: "Comprobante: PDF, JPG o PNG." };

  const g = await gateObligacion(obligacionId);
  if (!g.ok) return { ...initialSimpleState, error: g.error };

  const supabase = createClient();
  const { data: o } = await supabase
    .from("obligaciones_sat")
    .select("empresa_id, periodo_anio, periodo_mes, tipo")
    .eq("id", obligacionId)
    .maybeSingle();
  if (!o)
    return { ...initialSimpleState, error: "Obligación no encontrada." };

  const ts = Date.now();
  const ext = file.name.split(".").pop() || "pdf";
  const periodo = `${o.periodo_anio}${o.periodo_mes ? `-${String(o.periodo_mes).padStart(2, "0")}` : ""}`;
  const path = `${o.empresa_id}/${o.periodo_anio}/${o.tipo}_${periodo}/${ts}_${kind}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) return { ...initialSimpleState, error: upErr.message };

  const col = kind === "acuse" ? "url_acuse" : "url_comprobante";
  const { error } = await supabase
    .from("obligaciones_sat")
    // Patch dinámico (col viene de unión 'url_acuse' | 'url_comprobante');
    // cast localizado al tipo Update<obligaciones_sat>.
    .update({ [col]: path, updated_at: new Date().toISOString() } as never)
    .eq("id", obligacionId);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ...initialSimpleState, error: error.message };
  }
  revalidatePath(`/finanzas/obligaciones/${obligacionId}`);
  return { ok: true, error: null };
}

export async function subirAcuse(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const obligacionId = formData.get("obligacion_id") as string;
  const file = formData.get("archivo") as File | null;
  if (!obligacionId || !file)
    return { ...initialSimpleState, error: "Faltan datos." };
  return subirArchivo(obligacionId, file, "acuse");
}

export async function subirComprobante(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const obligacionId = formData.get("obligacion_id") as string;
  const file = formData.get("archivo") as File | null;
  if (!obligacionId || !file)
    return { ...initialSimpleState, error: "Faltan datos." };
  return subirArchivo(obligacionId, file, "comprobante");
}

/**
 * Sube comprobante de pago + parsea con pdf-parse y actualiza:
 *   monto_pagado, fecha_pago, numero_operacion, linea_captura, estado.
 */
export async function subirComprobanteConParser(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const obligacionId = formData.get("obligacion_id") as string;
  const file = formData.get("archivo") as File | null;
  if (!obligacionId || !file) {
    return { ...initialSimpleState, error: "Faltan datos." };
  }

  // 1. Subir archivo
  const r1 = await subirArchivo(obligacionId, file, "comprobante");
  if (!r1.ok) return r1;

  // 2. Parsear PDF
  try {
    const { parsearComprobantePago } = await import("@/lib/obligaciones/parser");
    const buffer = Buffer.from(await file.arrayBuffer());
    const datos = await parsearComprobantePago(buffer);

    if (datos.monto_pagado || datos.fecha_pago || datos.linea_captura) {
      const supabase = createClient();
      const { data: o } = await supabase
        .from("obligaciones_sat")
        .select("fecha_vencimiento")
        .eq("id", obligacionId)
        .maybeSingle();

      const venc = (o as { fecha_vencimiento: string } | null)?.fecha_vencimiento;
      let estado: "pagada" | "extemporanea" = "pagada";
      if (datos.fecha_pago && venc && datos.fecha_pago > venc) {
        estado = "extemporanea";
      }

      const update: Record<string, unknown> = {
        estado,
        updated_at: new Date().toISOString(),
      };
      if (datos.monto_pagado != null) update.monto_pagado = datos.monto_pagado;
      if (datos.fecha_pago) {
        update.fecha_pago = datos.fecha_pago;
        update.fecha_presentacion = datos.fecha_pago;
      }
      if (datos.numero_operacion) update.numero_operacion = datos.numero_operacion;
      if (datos.linea_captura) update.linea_captura = datos.linea_captura;

      const { error } = await supabase
        .from("obligaciones_sat")
        .update(update as never)
        .eq("id", obligacionId);
      if (error) {
        return {
          ok: true,
          error: `Archivo subido pero no se pudo actualizar: ${error.message}`,
        };
      }
    }
  } catch (e) {
    return {
      ok: true,
      error: `Subido. Parser falló: ${(e as Error).message}`,
    };
  }

  revalidatePath(`/finanzas/obligaciones/${obligacionId}`);
  return { ok: true, error: null };
}

/**
 * Sube acuse + parsea (monto_calculado, línea, conceptos).
 */
export async function subirAcuseConParser(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const obligacionId = formData.get("obligacion_id") as string;
  const file = formData.get("archivo") as File | null;
  if (!obligacionId || !file) {
    return { ...initialSimpleState, error: "Faltan datos." };
  }

  const r1 = await subirArchivo(obligacionId, file, "acuse");
  if (!r1.ok) return r1;

  try {
    const { parsearAcuseDeclaracion } = await import("@/lib/obligaciones/parser");
    const buffer = Buffer.from(await file.arrayBuffer());
    const datos = await parsearAcuseDeclaracion(buffer);

    if (datos.monto_calculado || datos.linea_captura) {
      const supabase = createClient();
      const update: Record<string, unknown> = {
        estado: "presentada",
        fecha_presentacion: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      };
      if (datos.monto_calculado != null)
        update.monto_calculado = datos.monto_calculado;
      if (datos.linea_captura) update.linea_captura = datos.linea_captura;

      const { error } = await supabase
        .from("obligaciones_sat")
        .update(update as never)
        .eq("id", obligacionId);
      if (error) {
        return {
          ok: true,
          error: `Subido pero no se pudo actualizar: ${error.message}`,
        };
      }
    }
  } catch (e) {
    return {
      ok: true,
      error: `Subido. Parser falló: ${(e as Error).message}`,
    };
  }

  revalidatePath(`/finanzas/obligaciones/${obligacionId}`);
  return { ok: true, error: null };
}

// ============================================================================
// 9. Eliminar acuse / comprobante (CEO/tesorero)
// ============================================================================
export async function eliminarAcuse(
  obligacionId: string,
): Promise<SimpleState> {
  return eliminarArchivo(obligacionId, "acuse");
}

export async function eliminarComprobante(
  obligacionId: string,
): Promise<SimpleState> {
  return eliminarArchivo(obligacionId, "comprobante");
}

async function eliminarArchivo(
  obligacionId: string,
  kind: "acuse" | "comprobante",
): Promise<SimpleState> {
  const v = await obtenerVinculos();
  if (!esCEO(v) && !tieneAtributo(v, "tesorero_corporativo"))
    return { ...initialSimpleState, error: "Sin permiso." };

  const supabase = createClient();
  const col = kind === "acuse" ? "url_acuse" : "url_comprobante";
  const { data: o } = await supabase
    .from("obligaciones_sat")
    .select(col)
    .eq("id", obligacionId)
    .maybeSingle();
  const path = (o as Record<string, string | null> | null)?.[col];
  if (path) {
    await supabase.storage.from(BUCKET).remove([path]);
  }
  const { error } = await supabase
    .from("obligaciones_sat")
    // Patch dinámico; cast localizado al tipo Update<obligaciones_sat>.
    .update({ [col]: null, updated_at: new Date().toISOString() } as never)
    .eq("id", obligacionId);
  if (error) return { ...initialSimpleState, error: error.message };
  revalidatePath(`/finanzas/obligaciones/${obligacionId}`);
  return { ok: true, error: null };
}

/** URL firmada (10 min) para descargar un archivo del bucket. */
export async function getDownloadUrlObligacion(
  storagePath: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 600);
  if (error) return null;
  return data.signedUrl;
}

// ============================================================================
// 10. Generar obligaciones del año (llama función SQL existente)
// ============================================================================
export async function generarObligacionesAnuales(
  _prev: GenerarAnualesState,
  formData: FormData,
): Promise<GenerarAnualesState> {
  const parsed = GenerarAnualesSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    anio: formData.get("anio"),
  });
  if (!parsed.success)
    return { ...initialGenerarAnualesState, error: "Empresa o año inválidos." };
  const { empresa_id, anio } = parsed.data;

  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    esRolEn(v, empresa_id, ["director", "operativo"]);
  if (!puede)
    return {
      ...initialGenerarAnualesState,
      error: "Sin permiso para generar obligaciones de esta empresa.",
    };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("generar_obligaciones_anuales", {
    p_empresa_id: empresa_id,
    p_anio: anio,
  });
  if (error)
    return { ...initialGenerarAnualesState, error: error.message };
  revalidatePath("/finanzas/obligaciones");
  return {
    ok: true,
    error: null,
    insertados: typeof data === "number" ? data : 0,
  };
}

// ============================================================================
// 11. Revertir estado a 'pendiente' (CEO/tesorero)
// ============================================================================
export async function revertirEstado(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const parsed = RevertirEstadoSchema.safeParse({
    obligacion_id: formData.get("obligacion_id"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success)
    return { ...initialSimpleState, error: "Motivo inválido." };
  const d = parsed.data;
  const gateRev = await gateRevertir();
  if (!gateRev.ok) return { ...initialSimpleState, error: gateRev.error };
  const g = await gateObligacion(d.obligacion_id);
  if (!g.ok) return { ...initialSimpleState, error: g.error };

  const supabase = createClient();
  const { data: actual } = await supabase
    .from("obligaciones_sat")
    .select("observaciones")
    .eq("id", d.obligacion_id)
    .maybeSingle();
  const obsBase = (actual?.observaciones ?? "") as string;
  const nuevasObs = `${obsBase}\n\n[REVERSIÓN ${new Date().toISOString().slice(0, 10)}] ${d.motivo}`.trim();

  const { error } = await supabase
    .from("obligaciones_sat")
    .update({
      estado: "pendiente",
      fecha_presentacion: null,
      fecha_pago: null,
      monto_pagado: null,
      saldo_a_favor: null,
      observaciones: nuevasObs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.obligacion_id);
  if (error) return { ...initialSimpleState, error: error.message };
  revalidatePath(`/finanzas/obligaciones/${d.obligacion_id}`);
  revalidatePath("/finanzas/obligaciones");
  return { ok: true, error: null };
}
