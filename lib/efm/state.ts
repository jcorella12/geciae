/**
 * Tipos y constantes compartidas para Estados Financieros Mensuales (EFM).
 *
 * Los 13 documentos estándar que entrega el despacho contable cada mes.
 * (Sprint 3.2)
 */

export const TIPOS_DOC_EFM = [
  "balance_general",
  "estado_resultados",
  "balanza",
  "flujo_efectivo",
  "anexos_ingresos",
  "anexos_egresos",
  "conciliacion_iva",
  "iva_trasladado",
  "iva_acreditable",
  "subsidio",
  "impuestos_por_pagar",
  "bancos",
  "polizas",
] as const;

export type TipoDocEFM = (typeof TIPOS_DOC_EFM)[number];

export const ETIQUETA_TIPO_DOC: Record<TipoDocEFM, string> = {
  balance_general: "Balance General",
  estado_resultados: "Estado de Resultados",
  balanza: "Balanza de Comprobación",
  flujo_efectivo: "Flujo de Efectivo",
  anexos_ingresos: "Anexos Catálogo Ingresos",
  anexos_egresos: "Anexos Catálogo Egresos",
  conciliacion_iva: "Conciliación de IVA",
  iva_trasladado: "IVA Trasladado",
  iva_acreditable: "IVA Acreditable",
  subsidio: "Subsidio",
  impuestos_por_pagar: "Impuestos por Pagar",
  bancos: "Bancos (movimientos)",
  polizas: "Diarios y Pólizas",
};

export const MESES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// ============================================================================
// State types para Server Actions
// ============================================================================

export type EFMState = {
  ok: boolean;
  error: string | null;
  efmId?: string;
};

export const initialEFMState: EFMState = { ok: false, error: null };

export type SimpleEFMState = { ok: boolean; error: string | null };
export const initialSimpleEFMState: SimpleEFMState = {
  ok: false,
  error: null,
};

export type SubirPaqueteState = {
  ok: boolean;
  error: string | null;
  efmId?: string;
  subidos?: number;
  noClasificados?: string[];
};

export const initialSubirPaqueteState: SubirPaqueteState = {
  ok: false,
  error: null,
};

export type ExtraerKPIsState = {
  ok: boolean;
  error: string | null;
  kpis?: {
    utilidad_neta: number | null;
    ingresos_totales: number | null;
    egresos_totales: number | null;
    iva_trasladado: number | null;
    iva_acreditable: number | null;
    flujo_efectivo: number | null;
  };
  confidence?: number;
};

export const initialExtraerKPIsState: ExtraerKPIsState = {
  ok: false,
  error: null,
};

/** Lista los KPI keys que debe extraer la IA. */
export const KPIS_EFM = [
  "utilidad_neta",
  "ingresos_totales",
  "egresos_totales",
  "iva_trasladado",
  "iva_acreditable",
  "flujo_efectivo",
] as const;

export type KPIKey = (typeof KPIS_EFM)[number];

export const ETIQUETA_KPI: Record<KPIKey, string> = {
  utilidad_neta: "Utilidad neta",
  ingresos_totales: "Ingresos totales",
  egresos_totales: "Egresos totales",
  iva_trasladado: "IVA trasladado",
  iva_acreditable: "IVA acreditable",
  flujo_efectivo: "Flujo de efectivo",
};
