/**
 * Tipos compartidos para Levantamientos técnicos (Sprint 5.6).
 */

export type EstadoLevantamiento =
  | "programado"
  | "en_curso"
  | "completado"
  | "convertido_a_venta"
  | "no_convertido"
  | "cancelado";

export type EstadoPasoLevantamiento =
  | "pendiente"
  | "en_curso"
  | "completado"
  | "no_aplica";

export const ETIQUETA_ESTADO_LEVANTAMIENTO: Record<EstadoLevantamiento, string> = {
  programado: "Programado",
  en_curso: "En curso",
  completado: "Completado",
  convertido_a_venta: "Convertido a venta",
  no_convertido: "No convertido",
  cancelado: "Cancelado",
};

export const COLOR_ESTADO_LEVANTAMIENTO: Record<EstadoLevantamiento, string> = {
  programado: "bg-blue-100 text-blue-700",
  en_curso: "bg-amber-100 text-amber-700",
  completado: "bg-violet-100 text-violet-700",
  convertido_a_venta: "bg-emerald-100 text-emerald-700",
  no_convertido: "bg-zinc-100 text-zinc-600",
  cancelado: "bg-rose-100 text-rose-700",
};

export const ETIQUETA_ESTADO_PASO: Record<EstadoPasoLevantamiento, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completado: "Completado",
  no_aplica: "N/A",
};

export const ESTADOS_LEVANTAMIENTO: EstadoLevantamiento[] = [
  "programado",
  "en_curso",
  "completado",
  "convertido_a_venta",
  "no_convertido",
  "cancelado",
];

export type LevantamientoState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
  levantamientoId?: string;
};

export const initialLevantamientoState: LevantamientoState = {
  ok: false,
  error: null,
};

export type SimpleLevState = { ok: boolean; error: string | null };
export const initialSimpleLevState: SimpleLevState = { ok: false, error: null };
