// Tipos compartidos para Cotizaciones (sin "use server").

export type EstadoCotizacion =
  | "borrador"
  | "enviada"
  | "aceptada"
  | "rechazada"
  | "vencida"
  | "convertida"; // → proyecto

export const ETIQUETA_ESTADO_COTIZACION: Record<EstadoCotizacion, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
  convertida: "Convertida a proyecto",
};

export const COLOR_ESTADO_COTIZACION: Record<EstadoCotizacion, string> = {
  borrador: "bg-gray-100 text-gray-700",
  enviada: "bg-blue-100 text-blue-700",
  aceptada: "bg-emerald-100 text-emerald-700",
  rechazada: "bg-red-100 text-red-700",
  vencida: "bg-amber-100 text-amber-700",
  convertida: "bg-purple-100 text-purple-700",
};

export type CotizacionState = {
  ok: boolean;
  error: string | null;
  cotizacionId: string | null;
};

export const initialCotizacionState: CotizacionState = {
  ok: false,
  error: null,
  cotizacionId: null,
};

export type ConceptoForm = {
  orden?: number;
  servicio_id?: string | null;
  clave_sat?: string | null;
  descripcion: string;
  cantidad: number;
  unidad_sat?: string | null;
  precio_unitario: number;
  descuento?: number;
  iva_tasa?: number; // default 0.16
  observaciones?: string | null;
};

/**
 * Cálculo cliente del total a partir de partidas (debe coincidir con
 * el trigger SQL `recalcular_totales_cotizacion`).
 */
export function calcularTotales(
  conceptos: ConceptoForm[],
  descuentoGlobal = 0,
): {
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
} {
  let subtotal = 0;
  let descPartidas = 0;
  let iva = 0;
  for (const c of conceptos) {
    const importe = c.cantidad * c.precio_unitario;
    subtotal += importe;
    descPartidas += c.descuento ?? 0;
    iva += importe * (c.iva_tasa ?? 0.16);
  }
  const descuento = descPartidas + descuentoGlobal;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    descuento: Math.round(descuento * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    total: Math.round((subtotal - descuento + iva) * 100) / 100,
  };
}
