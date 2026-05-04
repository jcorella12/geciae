export type EstadoTareaProyecto =
  | "pendiente"
  | "en_curso"
  | "bloqueada"
  | "completada"
  | "cancelada";

export const ETIQUETA_ESTADO_TAREA: Record<EstadoTareaProyecto, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  bloqueada: "Bloqueada",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const COLOR_ESTADO_TAREA: Record<EstadoTareaProyecto, string> = {
  pendiente: "bg-gray-100 text-gray-700",
  en_curso: "bg-sky-100 text-sky-700",
  bloqueada: "bg-red-100 text-red-700",
  completada: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-zinc-100 text-zinc-500",
};

// Color hex usados en barras del Gantt
export const COLOR_BAR_TAREA: Record<EstadoTareaProyecto, string> = {
  pendiente: "#94a3b8",
  en_curso: "#0ea5e9",
  bloqueada: "#ef4444",
  completada: "#10b981",
  cancelada: "#a1a1aa",
};

export type PrioridadTarea = "baja" | "media" | "alta" | "urgente";

export const ETIQUETA_PRIORIDAD: Record<PrioridadTarea, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

export const COLOR_PRIORIDAD: Record<PrioridadTarea, string> = {
  baja: "bg-zinc-100 text-zinc-600",
  media: "bg-sky-100 text-sky-700",
  alta: "bg-amber-100 text-amber-700",
  urgente: "bg-red-100 text-red-700",
};

export type TareaState = {
  ok: boolean;
  error: string | null;
  id: string | null;
};

export const initialTareaState: TareaState = {
  ok: false,
  error: null,
  id: null,
};

export type SimpleState = { ok: boolean; error: string | null };
export const initialSimpleState: SimpleState = { ok: false, error: null };
