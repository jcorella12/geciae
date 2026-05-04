// Tipos compartidos para créditos y préstamos inter-co.
// Este archivo NO tiene "use server" — exporta tipos y constantes.

export type EstadoPrestamo =
  | "solicitado"
  | "aprobado"
  | "ejecutado"
  | "confirmado"
  | "pagado_total"
  | "pagado_parcial"
  | "cancelado";

export const ESTADOS_PRESTAMO_VIVOS: EstadoPrestamo[] = [
  "ejecutado",
  "confirmado",
  "pagado_parcial",
];

export const ETIQUETA_ESTADO_PRESTAMO: Record<EstadoPrestamo, string> = {
  solicitado: "Solicitado",
  aprobado: "Aprobado",
  ejecutado: "Transferido",
  confirmado: "Confirmado",
  pagado_total: "Pagado",
  pagado_parcial: "Pagado parcial",
  cancelado: "Cancelado",
};

export const COLOR_ESTADO_PRESTAMO: Record<EstadoPrestamo, string> = {
  solicitado: "bg-blue-100 text-blue-700",
  aprobado: "bg-purple-100 text-purple-700",
  ejecutado: "bg-amber-100 text-amber-700",
  confirmado: "bg-emerald-100 text-emerald-700",
  pagado_parcial: "bg-cyan-100 text-cyan-700",
  pagado_total: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

export type LineaCreditoState = {
  ok: boolean;
  error: string | null;
};

export const initialLineaState: LineaCreditoState = { ok: false, error: null };

export type PrestamoState = {
  ok: boolean;
  error: string | null;
  prestamoId: string | null;
};

export const initialPrestamoState: PrestamoState = {
  ok: false,
  error: null,
  prestamoId: null,
};
