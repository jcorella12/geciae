/**
 * Sprint X.2 — Tipos para portal empleado y bonos manuales.
 */

export type TipoBonoManual =
  | "productividad"
  | "puntualidad"
  | "desempeno"
  | "antiguedad"
  | "evento_especial"
  | "navidad"
  | "otro";

export const ETIQUETA_TIPO_BONO: Record<TipoBonoManual, string> = {
  productividad: "Productividad",
  puntualidad: "Puntualidad",
  desempeno: "Desempeño",
  antiguedad: "Antigüedad",
  evento_especial: "Evento especial",
  navidad: "Navidad",
  otro: "Otro",
};

export const COLOR_TIPO_BONO: Record<TipoBonoManual, string> = {
  productividad: "bg-blue-100 text-blue-700",
  puntualidad: "bg-emerald-100 text-emerald-700",
  desempeno: "bg-violet-100 text-violet-700",
  antiguedad: "bg-amber-100 text-amber-700",
  evento_especial: "bg-pink-100 text-pink-700",
  navidad: "bg-rose-100 text-rose-700",
  otro: "bg-zinc-100 text-zinc-600",
};

export const TIPOS_BONO: TipoBonoManual[] = [
  "productividad",
  "puntualidad",
  "desempeno",
  "antiguedad",
  "evento_especial",
  "navidad",
  "otro",
];

export type ResumenCompensacionAnual = {
  empleado_id: string;
  empresa_id: string;
  anio: number;
  total_percepciones_timbradas: number;
  total_deducciones: number;
  total_neto_recibido: number;
  total_otros_pagos: number;
  total_bonos_no_timbrados: number;
  total_capacitacion_recibida: number;
  total_combustible_vehiculo: number;
  /** Calculado en server: total_neto + bonos + capacitación + gasolina */
  total_compensacion_estimada: number;
};

export type BonoState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

export const initialBonoState: BonoState = { ok: false, error: null };
