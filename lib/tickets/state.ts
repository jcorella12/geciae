// Tipos compartidos para Tickets de soporte / calidad / no conformidades.

export type EstadoTicket =
  | "abierto"
  | "en_proceso"
  | "esperando_cliente"
  | "resuelto"
  | "cerrado";

export const ETIQUETA_ESTADO_TICKET: Record<EstadoTicket, string> = {
  abierto: "Abierto",
  en_proceso: "En proceso",
  esperando_cliente: "Esperando cliente",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export const COLOR_ESTADO_TICKET: Record<EstadoTicket, string> = {
  abierto: "bg-red-100 text-red-700",
  en_proceso: "bg-sky-100 text-sky-700",
  esperando_cliente: "bg-amber-100 text-amber-700",
  resuelto: "bg-emerald-100 text-emerald-700",
  cerrado: "bg-zinc-100 text-zinc-500",
};

export type PrioridadTicket = "baja" | "media" | "alta" | "critica";

export const ETIQUETA_PRIORIDAD_TICKET: Record<PrioridadTicket, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const COLOR_PRIORIDAD_TICKET: Record<PrioridadTicket, string> = {
  baja: "bg-zinc-100 text-zinc-600",
  media: "bg-sky-100 text-sky-700",
  alta: "bg-amber-100 text-amber-700",
  critica: "bg-red-100 text-red-800",
};

export const ORIGENES_TICKET = [
  { value: "portal", label: "Portal" },
  { value: "email", label: "Email" },
  { value: "telefono", label: "Teléfono" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "visita", label: "Visita en sitio" },
  { value: "deteccion_automatica", label: "Detección automática" },
  { value: "otro", label: "Otro" },
] as const;

// SLA sugerido en horas según prioridad
export const SLA_HORAS_DEFAULT: Record<PrioridadTicket, number> = {
  baja: 72,
  media: 24,
  alta: 8,
  critica: 2,
};

export type TicketState = {
  ok: boolean;
  error: string | null;
  ticketId: string | null;
};

export const initialTicketState: TicketState = {
  ok: false,
  error: null,
  ticketId: null,
};

export type ComentarioState = { ok: boolean; error: string | null };
export const initialComentarioState: ComentarioState = {
  ok: false,
  error: null,
};
