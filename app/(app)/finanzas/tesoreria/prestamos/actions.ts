"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  puedeAprobarPrestamo,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  aprobadoresPrestamo,
  crearNotificaciones,
  tesorerosCorporativos,
} from "@/lib/notificaciones/emisor";
import {
  PrestamoPagoSchema,
  PrestamoSolicitudSchema,
} from "@/lib/prestamos/schemas";
import type { PrestamoState } from "@/lib/prestamos/state";
import { createClient } from "@/lib/supabase/server";

export async function solicitarPrestamo(
  _prev: PrestamoState,
  formData: FormData,
): Promise<PrestamoState> {
  const parsed = PrestamoSolicitudSchema.safeParse({
    linea_id: formData.get("linea_id"),
    monto: formData.get("monto"),
    motivo: formData.get("motivo") || undefined,
    fecha_vencimiento: formData.get("fecha_vencimiento") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      prestamoId: null,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, prestamoId: null, error: "Sin sesión." };

  // Cargar línea para validar permisos del solicitante (debe ser de la empresa deudora)
  const { data: linea } = await supabase
    .from("lineas_credito_inter_co")
    .select(
      "id, empresa_acreedora_id, empresa_deudora_id, monto_autorizado, monto_utilizado, monto_disponible, activa, vigencia_inicio, vigencia_fin",
    )
    .eq("id", d.linea_id)
    .maybeSingle();
  if (!linea) {
    return { ok: false, prestamoId: null, error: "Línea no encontrada." };
  }
  if (linea.activa === false) {
    return { ok: false, prestamoId: null, error: "Línea inactiva." };
  }
  const hoy = new Date();
  if (
    new Date(linea.vigencia_inicio) > hoy ||
    new Date(linea.vigencia_fin) < hoy
  ) {
    return { ok: false, prestamoId: null, error: "Línea fuera de vigencia." };
  }
  const disponible = Number(
    linea.monto_disponible ??
      Number(linea.monto_autorizado) - Number(linea.monto_utilizado ?? 0),
  );
  if (d.monto > disponible) {
    return {
      ok: false,
      prestamoId: null,
      error: `Monto excede el disponible de la línea (${disponible.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}).`,
    };
  }

  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    esRolEn(v, linea.empresa_deudora_id, ["director", "operativo"]);
  if (!puede) {
    return {
      ok: false,
      prestamoId: null,
      error:
        "Sin permiso (debes pertenecer a la empresa deudora o ser tesorero/CEO).",
    };
  }

  // Generar número (PR-YYYY-NNNN) via función de Postgres
  const { data: numeroData } = await supabase.rpc("generar_numero_prestamo");
  const numero = (numeroData as string | null) ?? `PR-${Date.now()}`;

  // Auto-aprobación si solicitante tiene umbral
  const autoAprueba = puedeAprobarPrestamo(v, linea.empresa_acreedora_id, d.monto);
  const estadoInicial = autoAprueba ? "aprobado" : "solicitado";

  const { data: prestamo, error } = await supabase
    .from("prestamos_inter_co")
    .insert({
      linea_id: d.linea_id,
      empresa_acreedora_id: linea.empresa_acreedora_id,
      empresa_deudora_id: linea.empresa_deudora_id,
      numero,
      monto: d.monto,
      monto_pagado: 0,
      fecha_solicitud: new Date().toISOString().slice(0, 10),
      fecha_vencimiento: d.fecha_vencimiento,
      motivo: d.motivo,
      estado: estadoInicial,
      solicitado_por: user.id,
      aprobado_por: autoAprueba ? user.id : null,
      fecha_aprobacion: autoAprueba ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !prestamo) {
    return {
      ok: false,
      prestamoId: null,
      error: error?.message ?? "Error al solicitar préstamo.",
    };
  }

  // Notificar a aprobadores de la empresa acreedora (si no fue auto-aprobado)
  if (!autoAprueba) {
    const aprob = await aprobadoresPrestamo(linea.empresa_acreedora_id, d.monto);
    await crearNotificaciones(
      aprob
        .filter((id) => id !== user.id)
        .map((usuario_id) => ({
          usuario_id,
          empresa_id: linea.empresa_acreedora_id,
          tipo: "prestamo_pendiente_aprobacion",
          severidad: "warning",
          titulo: `Préstamo ${numero} pendiente de aprobación`,
          mensaje: `Solicitud por ${d.monto.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}.`,
          url: `/finanzas/tesoreria/prestamos/${prestamo.id}`,
          entidad_tipo: "prestamo_inter_co",
          entidad_id: prestamo.id,
        })),
    );
  }

  revalidatePath("/finanzas/tesoreria");
  revalidatePath("/finanzas/tesoreria/prestamos");
  revalidatePath("/finanzas/tesoreria/creditos");
  return { ok: true, prestamoId: prestamo.id, error: null };
}

export async function aprobarPrestamo(
  prestamoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: p } = await supabase
    .from("prestamos_inter_co")
    .select("id, empresa_acreedora_id, empresa_deudora_id, monto, numero, estado, solicitado_por")
    .eq("id", prestamoId)
    .maybeSingle();
  if (!p) return { ok: false, error: "Préstamo no encontrado." };
  if (p.estado !== "solicitado") {
    return { ok: false, error: "Solo se aprueba en estado solicitado." };
  }
  const v = await obtenerVinculos();
  if (!puedeAprobarPrestamo(v, p.empresa_acreedora_id, Number(p.monto))) {
    return { ok: false, error: "Sin permiso o monto excede tu umbral." };
  }
  const { error } = await supabase
    .from("prestamos_inter_co")
    .update({
      estado: "aprobado",
      aprobado_por: user.id,
      fecha_aprobacion: new Date().toISOString(),
    })
    .eq("id", prestamoId);
  if (error) return { ok: false, error: error.message };

  // Notificar al solicitante y a tesoreros (para que ejecuten transferencia)
  const tes = await tesorerosCorporativos();
  await crearNotificaciones([
    {
      usuario_id: p.solicitado_por,
      empresa_id: p.empresa_deudora_id,
      tipo: "prestamo_aprobado",
      severidad: "success",
      titulo: `Préstamo ${p.numero} aprobado`,
      url: `/finanzas/tesoreria/prestamos/${p.id}`,
      entidad_tipo: "prestamo_inter_co",
      entidad_id: p.id,
    },
    ...tes
      .filter((id) => id !== user.id && id !== p.solicitado_por)
      .map((usuario_id) => ({
        usuario_id,
        empresa_id: p.empresa_acreedora_id,
        tipo: "prestamo_listo_ejecutar",
        severidad: "info" as const,
        titulo: `Préstamo ${p.numero} listo para ejecutar`,
        mensaje: `Aprobado por ${p.monto.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}.`,
        url: `/finanzas/tesoreria/prestamos/${p.id}`,
        entidad_tipo: "prestamo_inter_co",
        entidad_id: p.id,
      })),
  ]);

  revalidatePath("/finanzas/tesoreria/prestamos");
  revalidatePath(`/finanzas/tesoreria/prestamos/${prestamoId}`);
  return { ok: true, error: null };
}

export async function ejecutarPrestamo(
  prestamoId: string,
  comprobante?: string | null,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: p } = await supabase
    .from("prestamos_inter_co")
    .select("id, empresa_acreedora_id, empresa_deudora_id, monto, numero, estado, solicitado_por")
    .eq("id", prestamoId)
    .maybeSingle();
  if (!p) return { ok: false, error: "Préstamo no encontrado." };
  if (p.estado !== "aprobado") {
    return { ok: false, error: "Solo se ejecuta en estado aprobado." };
  }
  const v = await obtenerVinculos();
  if (!esCEO(v) && !tieneAtributo(v, "tesorero_corporativo")) {
    return {
      ok: false,
      error: "Solo CEO o tesorero corporativo puede ejecutar la transferencia.",
    };
  }

  const { error } = await supabase
    .from("prestamos_inter_co")
    .update({
      estado: "ejecutado",
      ejecutado_por: user.id,
      fecha_ejecucion: new Date().toISOString().slice(0, 10),
      comprobante_transferencia: comprobante ?? null,
    })
    .eq("id", prestamoId);
  if (error) return { ok: false, error: error.message };

  // Notificar a director de empresa deudora para confirmar recepción
  const { data: dirs } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id, rol")
    .eq("empresa_id", p.empresa_deudora_id)
    .eq("activo", true)
    .in("rol", ["director", "ceo"]);

  await crearNotificaciones(
    (dirs ?? [])
      .filter((d) => d.usuario_id !== user.id)
      .map((d) => ({
        usuario_id: d.usuario_id as string,
        empresa_id: p.empresa_deudora_id,
        tipo: "prestamo_ejecutado_pendiente_confirmacion",
        severidad: "info" as const,
        titulo: `Préstamo ${p.numero} ejecutado — confirmar recepción`,
        mensaje: `Verifica en banco la recepción de ${p.monto.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}.`,
        url: `/finanzas/tesoreria/prestamos/${p.id}`,
        entidad_tipo: "prestamo_inter_co",
        entidad_id: p.id,
      })),
  );

  revalidatePath("/finanzas/tesoreria/prestamos");
  revalidatePath(`/finanzas/tesoreria/prestamos/${prestamoId}`);
  return { ok: true, error: null };
}

export async function confirmarRecepcionPrestamo(
  prestamoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: p } = await supabase
    .from("prestamos_inter_co")
    .select("id, empresa_deudora_id, estado, numero")
    .eq("id", prestamoId)
    .maybeSingle();
  if (!p) return { ok: false, error: "Préstamo no encontrado." };
  if (p.estado !== "ejecutado") {
    return { ok: false, error: "Solo se confirma en estado ejecutado." };
  }
  const v = await obtenerVinculos();
  if (!esCEO(v) && !esRolEn(v, p.empresa_deudora_id, "director")) {
    return {
      ok: false,
      error: "Solo el CEO o director de la empresa deudora puede confirmar.",
    };
  }

  const { error } = await supabase
    .from("prestamos_inter_co")
    .update({
      estado: "confirmado",
      confirmado_por: user.id,
      fecha_confirmacion: new Date().toISOString().slice(0, 10),
    })
    .eq("id", prestamoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/finanzas/tesoreria/prestamos");
  revalidatePath(`/finanzas/tesoreria/prestamos/${prestamoId}`);
  return { ok: true, error: null };
}

export async function registrarPagoPrestamo(
  prestamoId: string,
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const parsed = PrestamoPagoSchema.safeParse({
    monto_pago: formData.get("monto_pago"),
    fecha_pago: formData.get("fecha_pago") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const supabase = createClient();
  const { data: p } = await supabase
    .from("prestamos_inter_co")
    .select("id, empresa_acreedora_id, empresa_deudora_id, monto, monto_pagado, estado, numero")
    .eq("id", prestamoId)
    .maybeSingle();
  if (!p) return { ok: false, error: "Préstamo no encontrado." };
  if (!["ejecutado", "confirmado", "pagado_parcial"].includes(p.estado as string)) {
    return { ok: false, error: "Estado no permite pagos." };
  }
  const v = await obtenerVinculos();
  if (
    !esCEO(v) &&
    !tieneAtributo(v, "tesorero_corporativo") &&
    !esRolEn(v, p.empresa_deudora_id, "director")
  ) {
    return { ok: false, error: "Sin permiso para registrar pagos." };
  }

  const monto = Number(p.monto);
  const yaPagado = Number(p.monto_pagado ?? 0);
  const nuevoPagado = yaPagado + parsed.data.monto_pago;
  if (nuevoPagado > monto + 0.01) {
    return {
      ok: false,
      error: `Excede el monto del préstamo. Pendiente: ${(monto - yaPagado).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}.`,
    };
  }
  const totalmentePagado = nuevoPagado >= monto - 0.01;

  const { error } = await supabase
    .from("prestamos_inter_co")
    .update({
      monto_pagado: nuevoPagado,
      estado: totalmentePagado ? "pagado_total" : "pagado_parcial",
    })
    .eq("id", prestamoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/finanzas/tesoreria/prestamos");
  revalidatePath(`/finanzas/tesoreria/prestamos/${prestamoId}`);
  return { ok: true, error: null };
}

export async function cancelarPrestamo(
  prestamoId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("prestamos_inter_co")
    .select("id, empresa_acreedora_id, empresa_deudora_id, estado, solicitado_por")
    .eq("id", prestamoId)
    .maybeSingle();
  if (!p) return { ok: false, error: "Préstamo no encontrado." };
  if (!["solicitado", "aprobado"].includes(p.estado as string)) {
    return {
      ok: false,
      error: "Solo se cancelan préstamos no ejecutados.",
    };
  }
  const v = await obtenerVinculos();
  if (
    !esCEO(v) &&
    !tieneAtributo(v, "tesorero_corporativo") &&
    !esRolEn(v, p.empresa_acreedora_id, "director") &&
    !esRolEn(v, p.empresa_deudora_id, "director")
  ) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("prestamos_inter_co")
    .update({
      estado: "cancelado",
      observaciones: motivo,
    })
    .eq("id", prestamoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/finanzas/tesoreria/prestamos");
  revalidatePath(`/finanzas/tesoreria/prestamos/${prestamoId}`);
  return { ok: true, error: null };
}

/**
 * Devenga intereses de hoy para todos los préstamos vivos.
 * Lanzable manualmente desde UI por CEO o tesorero.
 */
export async function devengarInteresesHoy(): Promise<{
  ok: boolean;
  count: number;
  error: string | null;
}> {
  const v = await obtenerVinculos();
  if (!esCEO(v) && !tieneAtributo(v, "tesorero_corporativo")) {
    return { ok: false, count: 0, error: "Sin permiso." };
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("devengar_intereses_dia", {
    p_fecha: new Date().toISOString().slice(0, 10),
  });
  if (error) return { ok: false, count: 0, error: error.message };
  revalidatePath("/finanzas/tesoreria/prestamos");
  return { ok: true, count: (data as number) ?? 0, error: null };
}
