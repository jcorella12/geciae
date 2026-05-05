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

// ============================================================================
// Sprint 6 — Plantillas y modalidad de pago
// ============================================================================

export const PLANTILLAS_PROYECTO = [
  {
    value: "solar_residencial",
    label: "Solar residencial",
    descripcion:
      "Casa-habitación, sistemas chicos. Trámites CFE NetMet, cliente final típicamente persona física.",
  },
  {
    value: "solar_comercial",
    label: "Solar comercial",
    descripcion:
      "Negocios PyME, oficinas, locales. Trámites CFE, evaluación de demanda en tarifas comerciales.",
  },
  {
    value: "solar_industrial",
    label: "Solar industrial",
    descripcion:
      "Industria mediana/grande, plantas con tarifas HM/HS. Estudios CFE más profundos, posible interconexión MT.",
  },
  {
    value: "mantenimiento_solar",
    label: "Mantenimiento solar",
    descripcion:
      "Contractual o puntual. No requiere trámites CFE.",
  },
  {
    value: "limpieza_solar",
    label: "Limpieza solar",
    descripcion: "Servicio puntual o programado.",
  },
  { value: "otro", label: "Otro", descripcion: "Cualquier otro tipo." },
] as const;

export type PlantillaProyecto = (typeof PLANTILLAS_PROYECTO)[number]["value"];

export const MODALIDADES_PAGO = [
  { value: "contado", label: "Contado", descripcion: "Pago al inicio." },
  {
    value: "credito_directo",
    label: "Crédito directo PSE",
    descripcion: "Plan de pagos pactado directamente con PSE.",
  },
  {
    value: "leasing",
    label: "Leasing financiero",
    descripcion: "Arrendamiento financiero con opción de compra.",
  },
  {
    value: "arrendamiento_puro",
    label: "Arrendamiento puro",
    descripcion: "Sin opción de compra. Mensualidades fijas.",
  },
  {
    value: "fideicomiso",
    label: "Fideicomiso",
    descripcion: "Esquema fiduciario con tercero.",
  },
  {
    value: "mixto",
    label: "Mixto",
    descripcion: "Combinación (anticipo + financiamiento + final).",
  },
  {
    value: "por_definir",
    label: "Por definir",
    descripcion: "Aún en negociación.",
  },
] as const;

export type ModalidadPago = (typeof MODALIDADES_PAGO)[number]["value"];

export const ETIQUETA_MODALIDAD: Record<ModalidadPago, string> =
  Object.fromEntries(MODALIDADES_PAGO.map((m) => [m.value, m.label])) as Record<
    ModalidadPago,
    string
  >;

export const ETIQUETA_PLANTILLA: Record<PlantillaProyecto, string> =
  Object.fromEntries(
    PLANTILLAS_PROYECTO.map((p) => [p.value, p.label]),
  ) as Record<PlantillaProyecto, string>;
