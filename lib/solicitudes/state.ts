/**
 * Tipos compartidos para Solicitudes de proyecto (Sprint 4).
 *
 * Sin "use server" — solo tipos/constantes.
 */

export type TipoSolicitud =
  | "compra"
  | "facturacion"
  | "anticipo_proveedor"
  | "cambio_alcance"
  | "reembolso_gasto"
  | "ot_inter_co"
  | "generica";

export type EstadoSolicitud =
  | "solicitada"
  | "en_revision"
  | "aprobada"
  | "rechazada"
  | "ejecutada"
  | "cerrada";

export type UrgenciaSolicitud = "baja" | "normal" | "alta" | "critica";

export const TIPOS_SOLICITUD: TipoSolicitud[] = [
  "compra",
  "facturacion",
  "anticipo_proveedor",
  "cambio_alcance",
  "reembolso_gasto",
  "ot_inter_co",
  "generica",
];

export const ETIQUETA_TIPO_SOLICITUD: Record<TipoSolicitud, string> = {
  compra: "Compra",
  facturacion: "Facturación a cliente",
  anticipo_proveedor: "Anticipo a proveedor",
  cambio_alcance: "Cambio de alcance",
  reembolso_gasto: "Reembolso de gasto",
  ot_inter_co: "OT inter-co",
  generica: "Genérica",
};

export const DESCRIPCION_TIPO_SOLICITUD: Record<TipoSolicitud, string> = {
  compra: "Solicita una OC para materiales o subcontratación.",
  facturacion: "Solicita emitir CFDI al cliente del proyecto.",
  anticipo_proveedor: "Solicita pagar anticipo a un proveedor.",
  cambio_alcance: "Solicita modificar el alcance/monto del proyecto.",
  reembolso_gasto: "Solicita reembolso de un gasto pagado de bolsillo.",
  ot_inter_co: "Solicita una orden de trabajo entre empresas del grupo.",
  generica: "Otra solicitud (libre).",
};

export const ETIQUETA_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  solicitada: "Solicitada",
  en_revision: "En revisión",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  ejecutada: "Ejecutada",
  cerrada: "Cerrada",
};

export const COLOR_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  solicitada: "bg-blue-100 text-blue-700",
  en_revision: "bg-amber-100 text-amber-700",
  aprobada: "bg-emerald-100 text-emerald-700",
  rechazada: "bg-red-100 text-red-700",
  ejecutada: "bg-violet-100 text-violet-700",
  cerrada: "bg-gray-100 text-gray-600",
};

export const ETIQUETA_URGENCIA: Record<UrgenciaSolicitud, string> = {
  baja: "Baja",
  normal: "Normal",
  alta: "Alta",
  critica: "Crítica",
};

export const COLOR_URGENCIA: Record<UrgenciaSolicitud, string> = {
  baja: "bg-zinc-100 text-zinc-600",
  normal: "bg-blue-100 text-blue-700",
  alta: "bg-amber-100 text-amber-700",
  critica: "bg-red-100 text-red-700",
};

// Estados activos (necesitan atención)
export const ESTADOS_ACTIVOS: EstadoSolicitud[] = [
  "solicitada",
  "en_revision",
  "aprobada",
];

// ============================================================================
// State types
// ============================================================================

export type SolicitudState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
  solicitudId?: string;
};

export const initialSolicitudState: SolicitudState = {
  ok: false,
  error: null,
};

export type SimpleSolicitudState = {
  ok: boolean;
  error: string | null;
};

export const initialSimpleSolicitudState: SimpleSolicitudState = {
  ok: false,
  error: null,
};

export type ComentarioState = {
  ok: boolean;
  error: string | null;
};

export const initialComentarioState: ComentarioState = {
  ok: false,
  error: null,
};
