"use server";

import { revalidatePath } from "next/cache";

import { obtenerVinculos, puedeCrearOCEn } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import type { RecepcionState } from "./state";

type ConceptoRecepcion = {
  id: string;
  cantidad_recibida: number;
};

/**
 * Registra recepción de mercancía/servicio para una OC.
 *
 * - Valida que la OC esté en estado que permita recepción (aprobada, enviada,
 *   parcial_recibida).
 * - Actualiza `cantidad_recibida` por concepto.
 * - Recalcula estado de la OC:
 *    - todos completos → "recibida" (+ fecha_entrega_real = hoy si era null)
 *    - alguno parcial → "parcial_recibida"
 *    - todos en 0 → mantiene estado actual
 */
export async function registrarRecepcion(
  ocId: string,
  _prev: RecepcionState,
  formData: FormData,
): Promise<RecepcionState> {
  const v = await obtenerVinculos();

  const supabase = createClient();

  const { data: oc } = await supabase
    .from("ordenes_compra")
    .select("id, empresa_id, estado, fecha_entrega_real")
    .eq("id", ocId)
    .maybeSingle();
  if (!oc) return { ok: false, error: "OC no encontrada." };

  if (!puedeCrearOCEn(v, oc.empresa_id)) {
    return { ok: false, error: "Sin permiso para registrar recepción." };
  }

  const estadosPermitidos = ["aprobada", "enviada", "parcial_recibida", "recibida"];
  if (!estadosPermitidos.includes(oc.estado ?? "")) {
    return {
      ok: false,
      error: `OC en estado "${oc.estado}" no permite registro de recepción. Apruébala primero.`,
    };
  }

  const conceptosRaw = formData.get("conceptos");
  if (typeof conceptosRaw !== "string") {
    return { ok: false, error: "Datos de conceptos faltantes." };
  }
  let conceptos: ConceptoRecepcion[];
  try {
    conceptos = JSON.parse(conceptosRaw) as ConceptoRecepcion[];
  } catch {
    return { ok: false, error: "JSON inválido." };
  }
  if (!Array.isArray(conceptos) || conceptos.length === 0) {
    return { ok: false, error: "No hay conceptos para actualizar." };
  }

  // Update por concepto.
  for (const c of conceptos) {
    if (c.cantidad_recibida < 0) {
      return { ok: false, error: "Cantidad recibida no puede ser negativa." };
    }
    const { error } = await supabase
      .from("ordenes_compra_conceptos")
      .update({ cantidad_recibida: c.cantidad_recibida })
      .eq("id", c.id)
      .eq("oc_id", ocId);
    if (error) {
      return { ok: false, error: `Error al actualizar concepto: ${error.message}` };
    }
  }

  // Recalcular estado de la OC.
  const { data: conceptosActuales } = await supabase
    .from("ordenes_compra_conceptos")
    .select("cantidad, cantidad_recibida")
    .eq("oc_id", ocId);

  if (!conceptosActuales || conceptosActuales.length === 0) {
    return { ok: true, error: null };
  }

  let todosCompletos = true;
  let algunoRecibido = false;
  for (const c of conceptosActuales) {
    const pedida = Number(c.cantidad ?? 0);
    const recibida = Number(c.cantidad_recibida ?? 0);
    if (recibida > 0) algunoRecibido = true;
    if (recibida < pedida) todosCompletos = false;
  }

  let nuevoEstado: "recibida" | "parcial_recibida" | null = null;
  if (todosCompletos) nuevoEstado = "recibida";
  else if (algunoRecibido) nuevoEstado = "parcial_recibida";

  if (nuevoEstado) {
    const update: Record<string, unknown> = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString(),
    };
    if (nuevoEstado === "recibida" && !oc.fecha_entrega_real) {
      update.fecha_entrega_real = new Date().toISOString().slice(0, 10);
    }
    const { error } = await supabase
      .from("ordenes_compra")
      .update(update as never)
      .eq("id", ocId);
    if (error) {
      return { ok: false, error: `Error actualizando estado: ${error.message}` };
    }
  }

  revalidatePath(`/finanzas/oc/${ocId}`);
  revalidatePath(`/finanzas/oc/${ocId}/recepcion`);
  revalidatePath("/finanzas/oc");
  return { ok: true, error: null };
}
