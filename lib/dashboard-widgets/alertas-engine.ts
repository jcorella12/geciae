/**
 * Sprint Z.1.5.A — Engine de alertas inteligentes para el dashboard.
 *
 * Reemplaza secciones permanentes del dashboard antiguo con alertas dinámicas
 * que solo aparecen cuando una condición de negocio se sale del rango esperado.
 *
 * Tipos de alerta soportados:
 *   - arrendamiento_vence  → vehículos arrendados con contrato a <30 días
 *   - indirecto_disparado  → reparto recibido +15% vs mes anterior
 *   - conciliacion_diff    → >$10k sin conciliar últimos 30 días
 *   - sat_urgente          → obligaciones SAT pendientes a <7 días
 *   - proveedor_69b        → proveedores con semáforo negro (69-B definitivo)
 *
 * Los thresholds están centralizados en la constante UMBRALES para facilitar
 * ajustarlos tras observar el comportamiento real del grupo.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type Severidad = "info" | "warning" | "danger";

export type AlertaCalculada = {
  tipo: string;
  severidad: Severidad;
  titulo: string;
  mensaje: string;
  url?: string;
  monto?: number;
};

export const UMBRALES = {
  /** Días anticipación para alertar arrendamiento próximo a vencer */
  ARRENDAMIENTO_DIAS: 30,
  /** % variación indirectos vs mes anterior para alertar */
  INDIRECTO_VARIACION_PCT: 15,
  /** Monto mínimo en MXN sin conciliar últimos 30d para alertar */
  CONCILIACION_MIN_MXN: 10_000,
  /** Días anticipación para alertar obligación SAT urgente */
  SAT_URGENTE_DIAS: 7,
} as const;

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function diasDesdeHoy(dias: number): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Evalúa todas las condiciones de alerta y retorna las que están disparadas.
 * Si `empresaId` es null, evalúa para todas las empresas accesibles por RLS.
 */
export async function calcularAlertas(
  supabase: SupabaseClient,
  empresaId: string | null,
): Promise<AlertaCalculada[]> {
  const alertas: AlertaCalculada[] = [];

  await Promise.all([
    alertaArrendamientos(supabase, empresaId).then((a) => a && alertas.push(a)),
    alertaIndirectos(supabase, empresaId).then((a) => a && alertas.push(a)),
    alertaConciliacion(supabase, empresaId).then((a) => a && alertas.push(a)),
    alertaSatUrgente(supabase, empresaId).then((a) => a && alertas.push(a)),
    alerta69B(supabase, empresaId).then((a) => a && alertas.push(a)),
  ]);

  // Ordenar por severidad: danger → warning → info
  const orden: Record<Severidad, number> = { danger: 0, warning: 1, info: 2 };
  return alertas.sort((a, b) => orden[a.severidad] - orden[b.severidad]);
}

// ============================================================================
// Cada alerta como función independiente para testing y composición
// ============================================================================

async function alertaArrendamientos(
  supabase: SupabaseClient,
  empresaId: string | null,
): Promise<AlertaCalculada | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("vehiculos")
    .select("id, placa, fecha_termino_contrato")
    .eq("tipo_propiedad", "arrendado")
    .eq("estatus", "activo")
    .gte("fecha_termino_contrato", hoy())
    .lte("fecha_termino_contrato", diasDesdeHoy(UMBRALES.ARRENDAMIENTO_DIAS));

  if (empresaId) q = q.eq("empresa_id", empresaId);

  const { data, error } = await q;
  if (error || !data || data.length === 0) return null;

  return {
    tipo: "arrendamiento_vence",
    severidad: "warning",
    titulo: `${data.length} arrendamiento${data.length === 1 ? "" : "s"} por vencer`,
    mensaje: `Vehículos con contrato expirando en próximos ${UMBRALES.ARRENDAMIENTO_DIAS} días`,
    url: "/activos",
  };
}

async function alertaIndirectos(
  supabase: SupabaseClient,
  empresaId: string | null,
): Promise<AlertaCalculada | null> {
  if (!empresaId) return null; // Solo aplica con empresa específica

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "comparar_indirectos_mes_anterior",
    { p_empresa_id: empresaId },
  );

  if (error || !data || data.length === 0) return null;
  const row = Array.isArray(data) ? data[0] : data;
  const variacion = Number(row.variacion_pct ?? 0);
  const diferencia = Number(row.diferencia_monto ?? 0);

  if (variacion <= UMBRALES.INDIRECTO_VARIACION_PCT) return null;

  return {
    tipo: "indirecto_disparado",
    severidad: "warning",
    titulo: `Indirectos +${variacion.toFixed(1)}% vs mes anterior`,
    mensaje: `De ${row.mes_anterior} a ${row.mes_actual}: +${fmtMxn.format(diferencia)}`,
    url: "/finanzas/centros",
    monto: diferencia,
  };
}

async function alertaConciliacion(
  supabase: SupabaseClient,
  empresaId: string | null,
): Promise<AlertaCalculada | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("bancos_movimientos")
    .select("monto, empresa_id")
    .eq("conciliado", false)
    .gte("fecha", diasDesdeHoy(-30));

  if (empresaId) q = q.eq("empresa_id", empresaId);

  const { data, error } = await q;
  if (error || !data) return null;

  const total = data.reduce(
    (acc: number, m: { monto: number | string }) => acc + Math.abs(Number(m.monto ?? 0)),
    0,
  );

  if (total < UMBRALES.CONCILIACION_MIN_MXN) return null;

  return {
    tipo: "conciliacion_diff",
    severidad: "warning",
    titulo: `${fmtMxn.format(total)} sin conciliar`,
    mensaje: "Movimientos bancarios pendientes de conciliación últimos 30 días",
    url: "/finanzas/tesoreria/cuentas",
    monto: total,
  };
}

async function alertaSatUrgente(
  supabase: SupabaseClient,
  empresaId: string | null,
): Promise<AlertaCalculada | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("obligaciones_sat")
    .select("id, tipo, periodo_label, fecha_vencimiento")
    .in("estado", ["pendiente", "en_proceso"])
    .gte("fecha_vencimiento", hoy())
    .lte("fecha_vencimiento", diasDesdeHoy(UMBRALES.SAT_URGENTE_DIAS));

  if (empresaId) q = q.eq("empresa_id", empresaId);

  const { data, error } = await q;
  if (error || !data || data.length === 0) return null;

  return {
    tipo: "sat_urgente",
    severidad: "danger",
    titulo: `${data.length} obligación${data.length === 1 ? "" : "es"} SAT esta semana`,
    mensaje: `Vencimientos críticos próximos ${UMBRALES.SAT_URGENTE_DIAS} días`,
    url: "/finanzas/cumplimiento",
  };
}

async function alerta69B(
  supabase: SupabaseClient,
  empresaId: string | null,
): Promise<AlertaCalculada | null> {
  // Proveedores con semáforo negro = 69-B definitivo
  // (no hay columna empresa_id en proveedores; cuenta agregada del catálogo)
  void empresaId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from("proveedores")
    .select("*", { count: "exact", head: true })
    .eq("semaforo", "negro");

  if (error || !count || count === 0) return null;

  return {
    tipo: "proveedor_69b",
    severidad: "danger",
    titulo: `${count} proveedor${count === 1 ? "" : "es"} en lista 69-B`,
    mensaje: "CFDIs no deducibles. Revisar urgente.",
    url: "/proveedores?riesgo=alto",
  };
}

/**
 * Persiste alertas calculadas en dashboard_alertas para histórico y para
 * evitar recalcular en cada render. Llamar desde un cron diario o desde
 * un server action.
 */
export async function snapshotAlertas(
  supabase: SupabaseClient,
  empresaId: string | null,
): Promise<{ insertadas: number; resueltas: number }> {
  const alertas = await calcularAlertas(supabase, empresaId);
  const tiposActivos = alertas.map((a) => a.tipo);

  let resueltas = 0;
  let insertadas = 0;

  // Marcar como resueltas las que ya no aparecen en este snapshot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseUpdate = (supabase as any)
    .from("dashboard_alertas")
    .update({ resuelta: true, resuelta_at: new Date().toISOString() })
    .eq("resuelta", false);

  const queryUpdate = empresaId
    ? baseUpdate.eq("empresa_id", empresaId)
    : baseUpdate.is("empresa_id", null);

  const { data: resueltasData } =
    tiposActivos.length > 0
      ? await queryUpdate.not("tipo", "in", `(${tiposActivos.map((t) => `"${t}"`).join(",")})`).select("id")
      : await queryUpdate.select("id");
  resueltas = resueltasData?.length ?? 0;

  // Insertar las nuevas (las que no tengan ya un registro activo)
  for (const a of alertas) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existente } = await (supabase as any)
      .from("dashboard_alertas")
      .select("id")
      .eq("tipo", a.tipo)
      .eq("resuelta", false)
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (existente) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("dashboard_alertas").insert({
      empresa_id: empresaId,
      tipo: a.tipo,
      severidad: a.severidad,
      titulo: a.titulo,
      mensaje: a.mensaje,
      url: a.url ?? null,
      monto: a.monto ?? null,
    });
    if (!error) insertadas++;
  }

  return { insertadas, resueltas };
}
