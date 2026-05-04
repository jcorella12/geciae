export type OTState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

export const initialOTState: OTState = {
  ok: false,
  error: null,
};

export const ESTADOS_OT = [
  { value: "solicitada", label: "Solicitada", color: "bg-secondary text-secondary-foreground" },
  { value: "aprobada", label: "Aprobada (ambas)", color: "bg-info/15 text-info" },
  { value: "en_proceso", label: "En proceso", color: "bg-warning/15 text-foreground" },
  { value: "completada_origen", label: "Completada por destino", color: "bg-info/15 text-info" },
  { value: "confirmada_destino", label: "Confirmada por origen", color: "bg-success/15 text-success" },
  { value: "lista_cobrar", label: "Lista para facturar", color: "bg-success/15 text-success" },
  { value: "facturada", label: "Facturada", color: "bg-success/15 text-success" },
  { value: "cobrada", label: "Cobrada", color: "bg-success/15 text-success" },
  { value: "cancelada", label: "Cancelada", color: "bg-destructive/15 text-destructive" },
] as const;

export type EstadoOT = (typeof ESTADOS_OT)[number]["value"];

export const MARGEN_DEFAULT = 0.15;

// ----------------------------------------------------------------------------
// Servicios (catálogo) — state movido aquí porque actions.ts es "use server"
// y no puede exportar tipos ni constantes (solo funciones async).
// ----------------------------------------------------------------------------
export type ServicioState = {
  ok: boolean;
  error: string | null;
};

export const initialServicioState: ServicioState = {
  ok: false,
  error: null,
};
