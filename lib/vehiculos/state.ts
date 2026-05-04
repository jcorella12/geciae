// Tipos compartidos para Vehículos.

export type EstatusVehiculo =
  | "activo"
  | "mantenimiento"
  | "reparacion"
  | "fuera_servicio"
  | "baja";

export const ETIQUETA_ESTATUS_VEHICULO: Record<EstatusVehiculo, string> = {
  activo: "Activo",
  mantenimiento: "Mantenimiento",
  reparacion: "En reparación",
  fuera_servicio: "Fuera de servicio",
  baja: "Baja",
};

export const COLOR_ESTATUS_VEHICULO: Record<EstatusVehiculo, string> = {
  activo: "bg-emerald-100 text-emerald-700",
  mantenimiento: "bg-amber-100 text-amber-700",
  reparacion: "bg-orange-100 text-orange-700",
  fuera_servicio: "bg-red-100 text-red-700",
  baja: "bg-gray-100 text-gray-500",
};

export type TipoPropiedadVehiculo =
  | "propio"
  | "arrendamiento_financiero"
  | "arrendamiento_puro"
  | "rentado_corto_plazo"
  | "comodato";

export const ETIQUETA_PROPIEDAD: Record<TipoPropiedadVehiculo, string> = {
  propio: "Propio",
  arrendamiento_financiero: "Arrendamiento financiero",
  arrendamiento_puro: "Arrendamiento puro",
  rentado_corto_plazo: "Renta corto plazo",
  comodato: "Comodato",
};

export type TipoEventoVehiculo =
  | "carga_combustible"
  | "lectura_km"
  | "mantenimiento_preventivo"
  | "mantenimiento_correctivo"
  | "reparacion"
  | "verificacion"
  | "tenencia"
  | "siniestro"
  | "multa"
  | "lavado"
  | "otros";

export const ETIQUETA_EVENTO_VEHICULO: Record<TipoEventoVehiculo, string> = {
  carga_combustible: "⛽ Carga combustible",
  lectura_km: "📊 Lectura km",
  mantenimiento_preventivo: "🔧 Mantenimiento preventivo",
  mantenimiento_correctivo: "🛠 Mantenimiento correctivo",
  reparacion: "⚠️ Reparación",
  verificacion: "✅ Verificación",
  tenencia: "📋 Tenencia",
  siniestro: "💥 Siniestro",
  multa: "🚓 Multa",
  lavado: "🧼 Lavado",
  otros: "📌 Otros",
};

export type VehiculoState = {
  ok: boolean;
  error: string | null;
  id: string | null;
};

export const initialVehiculoState: VehiculoState = {
  ok: false,
  error: null,
  id: null,
};

export type BitacoraState = {
  ok: boolean;
  error: string | null;
};

export const initialBitacoraState: BitacoraState = {
  ok: false,
  error: null,
};
