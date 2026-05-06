export type TipoActivoGrupo =
  | "medicion"
  | "elevacion"
  | "perforacion"
  | "energia"
  | "transporte"
  | "taller"
  | "oficina"
  | "otro";

export type EstadoActivoGrupo =
  | "disponible"
  | "en_uso"
  | "en_mantenimiento"
  | "en_calibracion"
  | "fuera_servicio"
  | "baja";

export type UnidadUsoActivo = "hora" | "dia" | "ciclo" | "kilometro";

export type AlertaActivo =
  | "ok"
  | "calibracion_vencida"
  | "mantenimiento_vencido"
  | "seguro_vencido"
  | "calibracion_proxima"
  | "mantenimiento_proximo";

export const ETIQUETA_TIPO_ACTIVO_GRUPO: Record<TipoActivoGrupo, string> = {
  medicion: "Medición",
  elevacion: "Elevación",
  perforacion: "Perforación",
  energia: "Energía",
  transporte: "Transporte",
  taller: "Taller",
  oficina: "Oficina",
  otro: "Otro",
};

export const ETIQUETA_ESTADO_ACTIVO: Record<EstadoActivoGrupo, string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  en_mantenimiento: "En mantenimiento",
  en_calibracion: "En calibración",
  fuera_servicio: "Fuera de servicio",
  baja: "Baja",
};

export const COLOR_ESTADO_ACTIVO: Record<EstadoActivoGrupo, string> = {
  disponible: "bg-emerald-100 text-emerald-800",
  en_uso: "bg-blue-100 text-blue-800",
  en_mantenimiento: "bg-amber-100 text-amber-800",
  en_calibracion: "bg-violet-100 text-violet-800",
  fuera_servicio: "bg-gray-100 text-gray-700",
  baja: "bg-red-100 text-red-700",
};

export const ETIQUETA_UNIDAD: Record<UnidadUsoActivo, string> = {
  hora: "h",
  dia: "día",
  ciclo: "ciclo",
  kilometro: "km",
};

export const COLOR_ALERTA: Record<AlertaActivo, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  calibracion_vencida: "bg-red-100 text-red-800",
  mantenimiento_vencido: "bg-red-100 text-red-800",
  seguro_vencido: "bg-red-100 text-red-800",
  calibracion_proxima: "bg-amber-100 text-amber-800",
  mantenimiento_proximo: "bg-amber-100 text-amber-800",
};

export const ETIQUETA_ALERTA: Record<AlertaActivo, string> = {
  ok: "OK",
  calibracion_vencida: "Calibración vencida",
  mantenimiento_vencido: "Mantenimiento vencido",
  seguro_vencido: "Seguro vencido",
  calibracion_proxima: "Calibración próxima",
  mantenimiento_proximo: "Mantenimiento próximo",
};

export type ActivoEnriquecido = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoActivoGrupo;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  anio_fabricacion: number | null;
  capacidad: string | null;
  empresa_propietaria_id: string;
  empresa_propietaria_codigo: string | null;
  empresa_propietaria_nombre: string | null;
  fecha_adquisicion: string;
  costo_adquisicion: number;
  vida_util_anios: number;
  valor_residual_pct: number;
  unidad_uso: UnidadUsoActivo;
  tarifa_calculada: number | null;
  tarifa_manual: number | null;
  tarifa_vigente: number;
  uso_estimado_anual: number;
  margen_administracion_pct: number;
  estado: EstadoActivoGrupo;
  ubicacion_actual_empresa_id: string | null;
  ubicacion_actual_codigo: string | null;
  ubicacion_actual_nombre: string | null;
  ubicacion_actual_descripcion: string | null;
  responsable_actual_id: string | null;
  requiere_calibracion: boolean;
  fecha_proxima_calibracion: string | null;
  fecha_proximo_mantenimiento: string | null;
  vigencia_seguro_hasta: string | null;
  alerta: AlertaActivo;
  observaciones: string | null;
};

export type ActivoState = {
  ok: boolean;
  id: string | null;
  error: string | null;
};

export const initialActivoState: ActivoState = {
  ok: false,
  id: null,
  error: null,
};
