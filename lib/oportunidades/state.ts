// Tipos compartidos para Oportunidades / Pipeline CRM (sin "use server").

export type EstadoOportunidad =
  | "lead"
  | "calificado"
  | "visita_tecnica"
  | "cotizacion_proceso"
  | "cotizacion_enviada"
  | "negociacion"
  | "ganado"
  | "perdido";

export const ETIQUETA_ESTADO_OPORTUNIDAD: Record<EstadoOportunidad, string> = {
  lead: "Lead",
  calificado: "Calificado",
  visita_tecnica: "Visita técnica",
  cotizacion_proceso: "Cotización en proceso",
  cotizacion_enviada: "Cotización enviada",
  negociacion: "Negociación",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const COLOR_ESTADO_OPORTUNIDAD: Record<EstadoOportunidad, string> = {
  lead: "bg-gray-100 text-gray-700",
  calificado: "bg-blue-100 text-blue-700",
  visita_tecnica: "bg-cyan-100 text-cyan-700",
  cotizacion_proceso: "bg-violet-100 text-violet-700",
  cotizacion_enviada: "bg-purple-100 text-purple-700",
  negociacion: "bg-amber-100 text-amber-700",
  ganado: "bg-emerald-100 text-emerald-700",
  perdido: "bg-red-100 text-red-700",
};

/**
 * Etapas en orden de pipeline. Las dos últimas son terminales.
 */
export const ETAPAS_PIPELINE: EstadoOportunidad[] = [
  "lead",
  "calificado",
  "visita_tecnica",
  "cotizacion_proceso",
  "cotizacion_enviada",
  "negociacion",
];

export const ETAPAS_TERMINALES: EstadoOportunidad[] = ["ganado", "perdido"];

/**
 * Probabilidad sugerida por etapa (puede ajustarse manualmente).
 */
export const PROBABILIDAD_DEFAULT: Record<EstadoOportunidad, number> = {
  lead: 0.1,
  calificado: 0.25,
  visita_tecnica: 0.4,
  cotizacion_proceso: 0.55,
  cotizacion_enviada: 0.7,
  negociacion: 0.85,
  ganado: 1.0,
  perdido: 0.0,
};

export type FuenteOportunidad =
  | "web"
  | "redes_sociales"
  | "referido"
  | "llamada"
  | "evento"
  | "feria"
  | "cliente_existente"
  | "prospeccion_directa"
  | "otro";

export const ETIQUETA_FUENTE: Record<FuenteOportunidad, string> = {
  web: "Web",
  redes_sociales: "Redes sociales",
  referido: "Referido",
  llamada: "Llamada",
  evento: "Evento",
  feria: "Feria",
  cliente_existente: "Cliente existente",
  prospeccion_directa: "Prospección directa",
  otro: "Otro",
};

export type TipoActividadComercial =
  | "llamada"
  | "reunion"
  | "correo"
  | "visita_tecnica"
  | "demo"
  | "envio_cotizacion"
  | "seguimiento"
  | "negociacion"
  | "cierre"
  | "nota";

export const ETIQUETA_ACTIVIDAD: Record<TipoActividadComercial, string> = {
  llamada: "📞 Llamada",
  reunion: "🤝 Reunión",
  correo: "✉️ Correo",
  visita_tecnica: "🔍 Visita técnica",
  demo: "🎬 Demo",
  envio_cotizacion: "📄 Envío cotización",
  seguimiento: "🔁 Seguimiento",
  negociacion: "💬 Negociación",
  cierre: "🎯 Cierre",
  nota: "📝 Nota",
};

export type OportunidadState = {
  ok: boolean;
  error: string | null;
  oportunidadId: string | null;
};

export const initialOportunidadState: OportunidadState = {
  ok: false,
  error: null,
  oportunidadId: null,
};

export type ActividadState = {
  ok: boolean;
  error: string | null;
};

export const initialActividadState: ActividadState = {
  ok: false,
  error: null,
};

/**
 * Calcula el "valor ponderado" del pipeline = monto * probabilidad.
 */
export function valorPonderado(
  monto: number | null | undefined,
  probabilidad: number | null | undefined,
): number {
  return Number(monto ?? 0) * Number(probabilidad ?? 0);
}
