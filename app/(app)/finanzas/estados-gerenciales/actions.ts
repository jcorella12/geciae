"use server";

/**
 * Sprint EF — Server actions de Estados Gerenciales.
 * Llama a las funciones SQL: calcular_balance_general, calcular_estado_resultados,
 * calcular_flujo_efectivo, comparar_resultados_periodos, proyeccion_flujo_proximas_semanas
 * y los respectivos drill-downs.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  BalanceGeneral,
  CategoriaDrillBalance,
  CategoriaDrillResultados,
  CategoriaFlujo,
  ComparativoResultados,
  EstadoResultados,
  FlujoEfectivo,
  ProyeccionFlujo,
} from "@/lib/estados-gerenciales/state";

async function exigirPermiso(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puede } = await (supabase as any).rpc(
    "usuario_puede_ver_estados_gerenciales",
  );
  if (!puede) {
    throw new Error(
      "Sin permisos. Solo CEO + contralor + tesorero corporativo pueden ver estados gerenciales.",
    );
  }
}

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------
export async function obtenerBalanceGeneral(
  empresaId: string | null,
  fechaCorte?: string,
): Promise<BalanceGeneral> {
  await exigirPermiso();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "calcular_balance_general",
    {
      p_empresa_id: empresaId,
      p_fecha_corte: fechaCorte ?? new Date().toISOString().slice(0, 10),
    },
  );
  if (error) throw new Error(error.message);
  return data as BalanceGeneral;
}

export async function obtenerBalanceDrillDown(
  empresaId: string | null,
  categoria: CategoriaDrillBalance,
  fechaCorte?: string,
): Promise<unknown[]> {
  await exigirPermiso();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("balance_drill_down", {
    p_empresa_id: empresaId,
    p_categoria: categoria,
    p_fecha_corte: fechaCorte ?? new Date().toISOString().slice(0, 10),
  });
  if (error) throw new Error(error.message);
  return (data as unknown[]) ?? [];
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------
export async function obtenerEstadoResultados(
  empresaId: string | null,
  fechaInicio: string,
  fechaFin: string,
): Promise<EstadoResultados> {
  await exigirPermiso();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "calcular_estado_resultados",
    {
      p_empresa_id: empresaId,
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin,
    },
  );
  if (error) throw new Error(error.message);
  return data as EstadoResultados;
}

export async function obtenerComparativoResultados(
  empresaId: string | null,
  inicioActual: string,
  finActual: string,
  inicioAnterior: string,
  finAnterior: string,
): Promise<ComparativoResultados> {
  await exigirPermiso();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "comparar_resultados_periodos",
    {
      p_empresa_id: empresaId,
      p_fecha_inicio_actual: inicioActual,
      p_fecha_fin_actual: finActual,
      p_fecha_inicio_anterior: inicioAnterior,
      p_fecha_fin_anterior: finAnterior,
    },
  );
  if (error) throw new Error(error.message);
  return data as ComparativoResultados;
}

export async function obtenerResultadosDrillDown(
  empresaId: string | null,
  categoria: CategoriaDrillResultados,
  inicio: string,
  fin: string,
): Promise<unknown[]> {
  await exigirPermiso();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "resultados_drill_down",
    {
      p_empresa_id: empresaId,
      p_categoria: categoria,
      p_fecha_inicio: inicio,
      p_fecha_fin: fin,
    },
  );
  if (error) throw new Error(error.message);
  return (data as unknown[]) ?? [];
}

// ---------------------------------------------------------------------------
// Flujo
// ---------------------------------------------------------------------------
export async function obtenerFlujoEfectivo(
  empresaId: string | null,
  fechaInicio: string,
  fechaFin: string,
): Promise<FlujoEfectivo> {
  await exigirPermiso();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("calcular_flujo_efectivo", {
    p_empresa_id: empresaId,
    p_fecha_inicio: fechaInicio,
    p_fecha_fin: fechaFin,
  });
  if (error) throw new Error(error.message);
  return data as FlujoEfectivo;
}

export async function obtenerFlujoDrillDown(
  empresaId: string | null,
  categoria: CategoriaFlujo,
  inicio: string,
  fin: string,
): Promise<unknown[]> {
  await exigirPermiso();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("flujo_drill_down", {
    p_empresa_id: empresaId,
    p_categoria: categoria,
    p_fecha_inicio: inicio,
    p_fecha_fin: fin,
  });
  if (error) throw new Error(error.message);
  return (data as unknown[]) ?? [];
}

export async function obtenerProyeccionFlujo(
  empresaId: string | null,
  semanas = 8,
): Promise<ProyeccionFlujo> {
  await exigirPermiso();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "proyeccion_flujo_proximas_semanas",
    {
      p_empresa_id: empresaId,
      p_semanas: semanas,
    },
  );
  if (error) throw new Error(error.message);
  return data as ProyeccionFlujo;
}
