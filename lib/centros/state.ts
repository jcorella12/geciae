/**
 * Tipos compartidos para Centros de costo y utilidad (Sprint 5.5.1).
 *
 * Vive separado de actions.ts (que tiene "use server"). Sin async exports,
 * solo tipos y constantes.
 */

export type TipoCentro = "costo" | "utilidad";

export type SubtipoCentro =
  | "servicio_compartido"
  | "operativo"
  | "comercial"
  | "mantenimiento"
  | "capacitacion"
  | "certificacion"
  | "otro";

export type MetodoReparto =
  | "porcentaje_fijo"
  | "por_ingresos"
  | "por_empleados"
  | "por_proyectos"
  | "por_horas";

export type TipoEmisionReparto = "cfdi_inter_co" | "asiento_interno";

export type TipoMovimientoCentro =
  | "gasto_directo"
  | "reparto_recibido"
  | "ingreso_directo"
  | "ajuste"
  | "cierre_mensual"
  | "reparto_emitido";

// ============================================================================
// Etiquetas
// ============================================================================

export const ETIQUETA_TIPO_CENTRO: Record<TipoCentro, string> = {
  costo: "Centro de costo",
  utilidad: "Centro de utilidad",
};

export const ETIQUETA_SUBTIPO_CENTRO: Record<SubtipoCentro, string> = {
  servicio_compartido: "Servicio compartido",
  operativo: "Operativo",
  comercial: "Comercial",
  mantenimiento: "Mantenimiento",
  capacitacion: "Capacitación",
  certificacion: "Certificación",
  otro: "Otro",
};

export const DESCRIPCION_SUBTIPO_CENTRO: Record<SubtipoCentro, string> = {
  servicio_compartido:
    "CC del grupo (Admin, RH, Marketing, Calidad). Se reparte a otras empresas mediante reglas.",
  operativo:
    "CC interno de la empresa (Ingeniería, Ventas). No se reparte fuera.",
  comercial: "CU de línea de venta directa (instalaciones, cotizaciones).",
  mantenimiento: "CU de línea de servicios contractuales o puntuales.",
  capacitacion: "CU de cursos y entrenamiento (CIAE).",
  certificacion: "CU de certificaciones acreditadas (CIAE).",
  otro: "Categoría libre.",
};

export const ETIQUETA_METODO_REPARTO: Record<MetodoReparto, string> = {
  porcentaje_fijo: "Porcentaje fijo",
  por_ingresos: "Por ingresos del periodo",
  por_empleados: "Por # empleados activos",
  por_proyectos: "Por # proyectos activos",
  por_horas: "Por horas registradas",
};

export const DESCRIPCION_METODO_REPARTO: Record<MetodoReparto, string> = {
  porcentaje_fijo:
    "Repartes un porcentaje exacto. Suma de % por todas las reglas activas no debe exceder 100.",
  por_ingresos:
    "Proporcional a los ingresos del mes en cada empresa destino.",
  por_empleados:
    "Proporcional al # de empleados activos por empresa destino.",
  por_proyectos:
    "Proporcional al # de proyectos activos atendidos por empresa.",
  por_horas:
    "Proporcional a horas registradas por empleados (requiere time-tracking).",
};

export const ETIQUETA_EMISION_REPARTO: Record<TipoEmisionReparto, string> = {
  cfdi_inter_co: "CFDI inter-co (factura mensual)",
  asiento_interno: "Asiento interno (sin CFDI)",
};

export const ETIQUETA_TIPO_MOVIMIENTO: Record<TipoMovimientoCentro, string> = {
  gasto_directo: "Gasto directo",
  reparto_recibido: "Reparto recibido",
  ingreso_directo: "Ingreso directo",
  ajuste: "Ajuste manual",
  cierre_mensual: "Cierre mensual",
  reparto_emitido: "Reparto emitido",
};

// ============================================================================
// Colores (Tailwind)
// ============================================================================

export const COLOR_TIPO_CENTRO: Record<TipoCentro, string> = {
  costo: "bg-amber-100 text-amber-800 border-amber-300",
  utilidad: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

export const COLOR_SUBTIPO_CENTRO: Record<SubtipoCentro, string> = {
  servicio_compartido: "bg-violet-100 text-violet-700",
  operativo: "bg-blue-100 text-blue-700",
  comercial: "bg-emerald-100 text-emerald-700",
  mantenimiento: "bg-cyan-100 text-cyan-700",
  capacitacion: "bg-orange-100 text-orange-700",
  certificacion: "bg-pink-100 text-pink-700",
  otro: "bg-zinc-100 text-zinc-600",
};

export const COLOR_METODO_REPARTO: Record<MetodoReparto, string> = {
  porcentaje_fijo: "bg-blue-100 text-blue-700",
  por_ingresos: "bg-emerald-100 text-emerald-700",
  por_empleados: "bg-violet-100 text-violet-700",
  por_proyectos: "bg-amber-100 text-amber-700",
  por_horas: "bg-orange-100 text-orange-700",
};

// ============================================================================
// Listas para UI selectors
// ============================================================================

export const TIPOS_CENTRO: TipoCentro[] = ["costo", "utilidad"];

export const SUBTIPOS_CENTRO: SubtipoCentro[] = [
  "servicio_compartido",
  "operativo",
  "comercial",
  "mantenimiento",
  "capacitacion",
  "certificacion",
  "otro",
];

export const METODOS_REPARTO: MetodoReparto[] = [
  "porcentaje_fijo",
  "por_ingresos",
  "por_empleados",
  "por_proyectos",
  "por_horas",
];

export const TIPOS_EMISION_REPARTO: TipoEmisionReparto[] = [
  "cfdi_inter_co",
  "asiento_interno",
];

// ============================================================================
// State para Server Actions (pattern del proyecto)
// ============================================================================

export type CentroState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
  centroId?: string;
};

export const initialCentroState: CentroState = { ok: false, error: null };

export type ReglaRepartoState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
  reglaId?: string;
};

export const initialReglaRepartoState: ReglaRepartoState = {
  ok: false,
  error: null,
};

export type MovimientoState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
  movimientoId?: string;
};

export const initialMovimientoState: MovimientoState = {
  ok: false,
  error: null,
};

export type SimpleCentroState = { ok: boolean; error: string | null };
export const initialSimpleCentroState: SimpleCentroState = {
  ok: false,
  error: null,
};

// ============================================================================
// Helpers de negocio
// ============================================================================

/**
 * ¿Este subtipo se reparte? Solo `servicio_compartido` participa en cierre
 * mensual con allocation hacia otras empresas.
 */
export function subtipoEsRepartible(s: SubtipoCentro): boolean {
  return s === "servicio_compartido";
}

/**
 * ¿Este subtipo es de utilidad o de costo? Útil para validación al crear:
 * `comercial`, `mantenimiento`, `capacitacion`, `certificacion` deberían ser
 * `tipo='utilidad'`. `servicio_compartido` y `operativo` deberían ser
 * `tipo='costo'`. `otro` permite cualquiera.
 */
export function subtipoTipoSugerido(s: SubtipoCentro): TipoCentro | null {
  switch (s) {
    case "servicio_compartido":
    case "operativo":
      return "costo";
    case "comercial":
    case "mantenimiento":
    case "capacitacion":
    case "certificacion":
      return "utilidad";
    case "otro":
      return null;
  }
}
