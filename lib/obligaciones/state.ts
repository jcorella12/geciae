/**
 * State y constantes compartidas para Obligaciones SAT.
 *
 * Vive aparte de actions.ts porque ese archivo tiene "use server" y solo
 * puede exportar funciones async.
 */

export type EstadoObligacion =
  | "pendiente"
  | "en_proceso"
  | "presentada"
  | "pagada"
  | "rechazada"
  | "fuera_plazo"
  | "extemporanea"
  | "no_aplica";

export type TipoObligacion =
  | "iva_mensual"
  | "isr_provisional"
  | "isr_retenciones"
  | "diot"
  | "iva_retenciones"
  | "declaracion_anual"
  | "iva_anual"
  | "isn"
  | "icsoe"
  | "sisub"
  | "aportacion_imss"
  | "pago_infonavit"
  | "pago_fonacot"
  | "estatales"
  | "otra";

export const ETIQUETA_TIPO_OBLIGACION: Record<TipoObligacion, string> = {
  iva_mensual: "IVA mensual",
  isr_provisional: "ISR provisional",
  isr_retenciones: "Ret. ISR sueldos",
  diot: "DIOT",
  iva_retenciones: "Ret. IVA",
  declaracion_anual: "Declaración anual",
  iva_anual: "IVA anual",
  isn: "ISN estatal",
  icsoe: "ICSOE",
  sisub: "SISUB",
  aportacion_imss: "IMSS bimestral",
  pago_infonavit: "INFONAVIT",
  pago_fonacot: "FONACOT",
  estatales: "Estatales",
  otra: "Otra",
};

export const ETIQUETA_ESTADO_OBLIGACION: Record<EstadoObligacion, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  presentada: "Presentada",
  pagada: "Pagada",
  rechazada: "Rechazada",
  fuera_plazo: "Fuera de plazo",
  extemporanea: "Extemporánea",
  no_aplica: "No aplica",
};

export const COLOR_ESTADO_OBLIGACION: Record<EstadoObligacion, string> = {
  pendiente: "bg-gray-100 text-gray-700",
  en_proceso: "bg-blue-100 text-blue-700",
  presentada: "bg-emerald-100 text-emerald-700",
  pagada: "bg-emerald-100 text-emerald-700",
  rechazada: "bg-red-100 text-red-700",
  fuera_plazo: "bg-amber-100 text-amber-700",
  extemporanea: "bg-amber-100 text-amber-700",
  no_aplica: "bg-gray-50 text-gray-500",
};

export type ObligacionState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

export const initialObligacionState: ObligacionState = {
  ok: false,
  error: null,
};

export type SimpleState = { ok: boolean; error: string | null };
export const initialSimpleState: SimpleState = { ok: false, error: null };

export type GenerarAnualesState = {
  ok: boolean;
  error: string | null;
  insertados?: number;
};

export const initialGenerarAnualesState: GenerarAnualesState = {
  ok: false,
  error: null,
};
