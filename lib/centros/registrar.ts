/**
 * Helpers para registrar movimientos en centros_movimientos al aprobar/timbrar
 * transacciones existentes (Sprint 5.5.3).
 *
 * Cada función es best-effort: si el centro_id es NULL en la transacción,
 * la función no falla, simplemente no registra movimiento. Eso permite que
 * las transacciones existentes (sin centro) sigan funcionando.
 *
 * NO usa "use server"; estas funciones se llaman desde server actions que
 * ya están en contexto de servidor.
 */

import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; movimientoId?: string } | { ok: false; error: string };

/**
 * Registra movimiento de gasto al aprobar una OC.
 * El movimiento es de tipo 'gasto_directo' en el centro asignado.
 */
export async function registrarMovimientoOC(ocId: string): Promise<Result> {
  const supabase = createClient();
  const { data: oc } = await supabase
    .from("ordenes_compra")
    .select("id, empresa_id, total, fecha_emision, numero, centro_id, proyecto_id, capturado_por")
    .eq("id", ocId)
    .maybeSingle();
  if (!oc) return { ok: false, error: "OC no encontrada" };
  if (!oc.centro_id) return { ok: true }; // sin centro: skip silencioso

  // Idempotencia: si ya existe movimiento para esta OC, no duplicar
  const { count } = await supabase
    .from("centros_movimientos")
    .select("id", { count: "exact", head: true })
    .eq("oc_id", ocId)
    .eq("tipo", "gasto_directo");
  if ((count ?? 0) > 0) return { ok: true };

  const { data, error } = await supabase
    .from("centros_movimientos")
    .insert({
      centro_id: oc.centro_id,
      empresa_id: oc.empresa_id,
      fecha: oc.fecha_emision,
      tipo: "gasto_directo" as never,
      concepto: `OC ${oc.numero}`,
      monto: oc.total,
      oc_id: oc.id,
      proyecto_id: oc.proyecto_id,
      capturado_por: oc.capturado_por,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, movimientoId: data.id };
}

/**
 * Registra dos movimientos al aprobar/completar una OT inter-co:
 *   - Centro origen: gasto_directo (la empresa origen paga)
 *   - Centro destino: ingreso_directo (la empresa destino cobra)
 */
export async function registrarMovimientoOT(otId: string): Promise<Result> {
  const supabase = createClient();
  const { data: ot } = await supabase
    .from("ordenes_trabajo_inter_co")
    .select(
      "id, empresa_origen_id, empresa_destino_id, total, fecha_solicitud, numero, centro_origen_id, centro_destino_id, proyecto_id, capturado_por",
    )
    .eq("id", otId)
    .maybeSingle();
  if (!ot) return { ok: false, error: "OT no encontrada" };

  const { count } = await supabase
    .from("centros_movimientos")
    .select("id", { count: "exact", head: true })
    .eq("ot_id", otId);
  if ((count ?? 0) > 0) return { ok: true }; // idempotente

  const inserts: Array<Record<string, unknown>> = [];
  if (ot.centro_origen_id) {
    inserts.push({
      centro_id: ot.centro_origen_id,
      empresa_id: ot.empresa_origen_id,
      fecha: ot.fecha_solicitud,
      tipo: "gasto_directo",
      concepto: `OT ${ot.numero} (origen)`,
      monto: ot.total,
      ot_id: ot.id,
      proyecto_id: ot.proyecto_id,
      capturado_por: ot.capturado_por,
    });
  }
  if (ot.centro_destino_id) {
    inserts.push({
      centro_id: ot.centro_destino_id,
      empresa_id: ot.empresa_destino_id,
      fecha: ot.fecha_solicitud,
      tipo: "ingreso_directo",
      concepto: `OT ${ot.numero} (destino)`,
      monto: ot.total,
      ot_id: ot.id,
      proyecto_id: ot.proyecto_id,
      capturado_por: ot.capturado_por,
    });
  }
  if (inserts.length === 0) return { ok: true };

  const { error } = await supabase
    .from("centros_movimientos")
    .insert(inserts as never);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Registra movimiento al timbrar un CFDI.
 * Si es CFDI emitido (es_emitido=TRUE) → ingreso_directo en centro
 * Si es CFDI recibido (es_emitido=FALSE) → gasto_directo en centro
 */
export async function registrarMovimientoCFDI(cfdiId: string): Promise<Result> {
  const supabase = createClient();
  const { data: c } = await supabase
    .from("cfdi")
    .select(
      "id, empresa_id, total, fecha_emision, serie, folio, centro_id, es_emitido",
    )
    .eq("id", cfdiId)
    .maybeSingle();
  if (!c) return { ok: false, error: "CFDI no encontrado" };
  if (!c.centro_id) return { ok: true };

  const { count } = await supabase
    .from("centros_movimientos")
    .select("id", { count: "exact", head: true })
    .eq("cfdi_id", cfdiId);
  if ((count ?? 0) > 0) return { ok: true };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión" };

  const fecha = c.fecha_emision
    ? new Date(c.fecha_emision as string).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("centros_movimientos").insert({
    centro_id: c.centro_id,
    empresa_id: c.empresa_id,
    fecha,
    tipo: (c.es_emitido ? "ingreso_directo" : "gasto_directo") as never,
    concepto: `CFDI ${c.serie ?? ""}${c.folio ? "-" + c.folio : ""}`.trim() ||
      "CFDI",
    monto: c.total,
    cfdi_id: c.id,
    capturado_por: user.id,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Registra movimiento al ejecutar (cargar) un gasto recurrente.
 * Se llama típicamente desde un cron mensual o al marcar pagado.
 */
export async function registrarMovimientoGastoRecurrente(
  gastoId: string,
  fechaCargo: string,
): Promise<Result> {
  const supabase = createClient();
  const { data: g } = await supabase
    .from("gastos_recurrentes")
    .select("id, empresa_id, monto, descripcion, centro_id, capturado_por")
    .eq("id", gastoId)
    .maybeSingle();
  if (!g) return { ok: false, error: "Gasto recurrente no encontrado" };
  if (!g.centro_id) return { ok: true };

  // Idempotencia: un movimiento por gasto+fecha
  const { count } = await supabase
    .from("centros_movimientos")
    .select("id", { count: "exact", head: true })
    .eq("gasto_recurrente_id", gastoId)
    .eq("fecha", fechaCargo);
  if ((count ?? 0) > 0) return { ok: true };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const capturado = (g.capturado_por as string | null) ?? user?.id;
  if (!capturado) return { ok: false, error: "Sin sesión" };

  const { error } = await supabase.from("centros_movimientos").insert({
    centro_id: g.centro_id,
    empresa_id: g.empresa_id,
    fecha: fechaCargo,
    tipo: "gasto_directo" as never,
    concepto: g.descripcion ?? "Gasto recurrente",
    monto: g.monto,
    gasto_recurrente_id: g.id,
    capturado_por: capturado,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Reasigna el centro de una transacción y mueve el movimiento existente.
 * Se usa desde la pantalla de limpieza progresiva.
 */
export async function reasignarCentroTransaccion(
  tipo: "oc" | "ot" | "cfdi" | "gasto_recurrente",
  transaccionId: string,
  nuevoCentroId: string | null,
): Promise<Result> {
  const supabase = createClient();
  const tabla = tipo === "oc"
    ? "ordenes_compra"
    : tipo === "ot"
      ? "ordenes_trabajo_inter_co"
      : tipo === "cfdi"
        ? "cfdi"
        : "gastos_recurrentes";
  const campo = tipo === "ot" ? "centro_origen_id" : "centro_id";

  const { error } = await supabase
    .from(tabla)
    // Patch dinámico; cast localizado al Update<tabla> que varía por tipo.
    .update({ [campo]: nuevoCentroId } as never)
    .eq("id", transaccionId);
  if (error) return { ok: false, error: error.message };

  // También actualiza movimientos existentes (si los hay)
  if (nuevoCentroId) {
    const fkColumn =
      tipo === "oc"
        ? "oc_id"
        : tipo === "ot"
          ? "ot_id"
          : tipo === "cfdi"
            ? "cfdi_id"
            : "gasto_recurrente_id";
    await supabase
      .from("centros_movimientos")
      .update({ centro_id: nuevoCentroId })
      .eq(fkColumn, transaccionId);
  }

  return { ok: true };
}
