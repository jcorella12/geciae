export type OCState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

export const initialOCState: OCState = {
  ok: false,
  error: null,
};

export const ESTADOS_OC = [
  { value: "borrador", label: "Borrador", color: "bg-secondary text-secondary-foreground" },
  { value: "pendiente_aprobacion", label: "Pendiente aprobación", color: "bg-warning/15 text-foreground" },
  { value: "aprobada", label: "Aprobada", color: "bg-success/15 text-success" },
  { value: "enviada", label: "Enviada al proveedor", color: "bg-info/15 text-info" },
  { value: "parcial_recibida", label: "Parcial recibida", color: "bg-info/15 text-info" },
  { value: "recibida", label: "Recibida", color: "bg-info/15 text-info" },
  { value: "pagada", label: "Pagada", color: "bg-success/15 text-success" },
  { value: "cancelada", label: "Cancelada", color: "bg-destructive/15 text-destructive" },
] as const;

export type EstadoOC = (typeof ESTADOS_OC)[number]["value"];

export const TASA_IVA_DEFAULT = 0.16;
