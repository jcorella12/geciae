export type ProyectoState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

export const initialProyectoState: ProyectoState = {
  ok: false,
  error: null,
};

export const ESTADOS_PROYECTO = [
  { value: "cotizacion", label: "Cotización", color: "bg-secondary text-secondary-foreground" },
  { value: "contrato_firmado", label: "Contrato firmado", color: "bg-info/15 text-info" },
  { value: "planeacion", label: "Planeación", color: "bg-info/15 text-info" },
  { value: "en_ejecucion", label: "En ejecución", color: "bg-warning/15 text-foreground" },
  { value: "en_cierre", label: "En cierre", color: "bg-warning/15 text-foreground" },
  { value: "entregado", label: "Entregado", color: "bg-success/15 text-success" },
  { value: "en_om", label: "En O&M", color: "bg-success/15 text-success" },
  { value: "cerrado", label: "Cerrado", color: "bg-secondary text-secondary-foreground" },
  { value: "cancelado", label: "Cancelado", color: "bg-destructive/15 text-destructive" },
] as const;

export type EstadoProyecto = (typeof ESTADOS_PROYECTO)[number]["value"];

export const TIPOS_PROYECTO = [
  { value: "solar_residencial", label: "Solar residencial" },
  { value: "solar_comercial", label: "Solar comercial" },
  { value: "solar_industrial", label: "Solar industrial" },
  { value: "electrico_industrial", label: "Eléctrico industrial" },
  { value: "subestacion", label: "Subestación" },
  { value: "mantenimiento_solar", label: "Mantenimiento solar" },
  { value: "limpieza_solar", label: "Limpieza solar" },
  { value: "capacitacion", label: "Capacitación" },
  { value: "certificacion", label: "Certificación / UVIE" },
  { value: "otro", label: "Otro" },
] as const;
