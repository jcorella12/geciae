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

// ----------------------------------------------------------------------------
// Contraloría (flujo del contralor, app oc-corporativo)
// ----------------------------------------------------------------------------

/**
 * Arriba de este total (con IVA) la OC NO se auto-aprueba por umbral: siempre
 * pasa por aprobación explícita (modelo híbrido; la doble firma
 * contralor+dirección completa llega en Fase 2).
 */
export const UMBRAL_DOBLE_AUTORIZACION = 100_000;

/** Tipos de compra — sugieren el rubro contable del catálogo. */
export const TIPOS_COMPRA = [
  { value: "gasto", label: "Gasto de operación", rubros: ["Gastos Generales", "Gastos De Administracion", "Gastos De Venta", "Otros Gastos"] },
  { value: "obra", label: "Costo de obra / proyecto", rubros: ["Costo De Ventas"] },
  { value: "material", label: "Material / inventario", rubros: ["Inventarios", "Costo De Ventas"] },
  { value: "activo", label: "Activo fijo", rubros: ["Inmuebles, Maquinaria Y Equipo Neto", "Activos Intangibles"] },
  { value: "servicio", label: "Servicio / honorarios", rubros: ["Gastos Generales", "Gastos De Administracion", "Gastos De Venta"] },
  { value: "anticipo", label: "Anticipo a proveedor", rubros: ["Pagos Anticipados"] },
  { value: "otro", label: "Otro", rubros: null },
] as const;

export type TipoCompra = (typeof TIPOS_COMPRA)[number]["value"];

/** Urgencia de pago → plazo en días hábiles (null = sin límite). */
export const URGENCIAS_OC = [
  { value: "cero", label: "Sin urgencia", dias: null as number | null, color: "bg-secondary text-secondary-foreground" },
  { value: "bajo", label: "Baja · 3 días hábiles", dias: 3, color: "bg-info/15 text-info" },
  { value: "medio", label: "Media · 48 h hábiles", dias: 2, color: "bg-warning/20 text-foreground" },
  { value: "alto", label: "Alta · 24 h hábiles", dias: 1, color: "bg-warning/40 text-foreground" },
  { value: "critica", label: "Crítica · hoy", dias: 0, color: "bg-destructive/15 text-destructive" },
] as const;

export type UrgenciaOC = (typeof URGENCIAS_OC)[number]["value"];

/**
 * Suma n días hábiles a una fecha ISO (sábado/domingo no cuentan; con n=0,
 * si cae en fin de semana recorre al hábil siguiente).
 */
export function sumarDiasHabiles(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  while (dt.getDay() === 0 || dt.getDay() === 6) dt.setDate(dt.getDate() + 1);
  let restan = n;
  while (restan > 0) {
    dt.setDate(dt.getDate() + 1);
    if (dt.getDay() !== 0 && dt.getDay() !== 6) restan--;
  }
  const z = (x: number) => String(x).padStart(2, "0");
  return `${dt.getFullYear()}-${z(dt.getMonth() + 1)}-${z(dt.getDate())}`;
}

/** Fecha límite de pago según urgencia (null si sin urgencia o sin fecha). */
export function limitePagoDe(
  fechaEmision: string | null,
  urgencia: string | null,
): string | null {
  if (!fechaEmision) return null;
  const u = URGENCIAS_OC.find((x) => x.value === urgencia);
  if (!u || u.dias === null) return null;
  return sumarDiasHabiles(fechaEmision, u.dias);
}
