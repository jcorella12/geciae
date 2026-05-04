// Tipos compartidos para el módulo de Personas (sin "use server").

export type CategoriaPersonal = "planta" | "por_obra" | "repse";

export const ETIQUETA_CATEGORIA: Record<CategoriaPersonal, string> = {
  planta: "Planta",
  por_obra: "Por obra",
  repse: "REPSE",
};

export const COLOR_CATEGORIA: Record<CategoriaPersonal, string> = {
  planta: "bg-emerald-100 text-emerald-700",
  por_obra: "bg-amber-100 text-amber-700",
  repse: "bg-purple-100 text-purple-700",
};

export type EstadoVacacion =
  | "pendiente"
  | "aprobada"
  | "rechazada"
  | "cancelada";

export const ETIQUETA_ESTADO_VACACION: Record<EstadoVacacion, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};

export const COLOR_ESTADO_VACACION: Record<EstadoVacacion, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  aprobada: "bg-emerald-100 text-emerald-700",
  rechazada: "bg-red-100 text-red-700",
  cancelada: "bg-gray-100 text-gray-700",
};

export type TipoVacacion =
  | "vacaciones"
  | "permiso_con_goce"
  | "permiso_sin_goce"
  | "incapacidad";

export const ETIQUETA_TIPO_VACACION: Record<TipoVacacion, string> = {
  vacaciones: "Vacaciones",
  permiso_con_goce: "Permiso con goce",
  permiso_sin_goce: "Permiso sin goce",
  incapacidad: "Incapacidad",
};

export type EstadoViatico =
  | "pendiente"
  | "aprobado"
  | "rechazado"
  | "reembolsado";

export const ETIQUETA_ESTADO_VIATICO: Record<EstadoViatico, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  reembolsado: "Reembolsado",
};

export const COLOR_ESTADO_VIATICO: Record<EstadoViatico, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  aprobado: "bg-blue-100 text-blue-700",
  rechazado: "bg-red-100 text-red-700",
  reembolsado: "bg-emerald-100 text-emerald-700",
};

export type CategoriaViatico =
  | "hospedaje"
  | "alimentos"
  | "transporte"
  | "combustible"
  | "peajes"
  | "estacionamiento"
  | "papeleria"
  | "telefono"
  | "otros";

export const ETIQUETA_CATEGORIA_VIATICO: Record<CategoriaViatico, string> = {
  hospedaje: "Hospedaje",
  alimentos: "Alimentos",
  transporte: "Transporte",
  combustible: "Combustible",
  peajes: "Peajes",
  estacionamiento: "Estacionamiento",
  papeleria: "Papelería",
  telefono: "Teléfono",
  otros: "Otros",
};

export type TipoDocumentoEmpleado =
  | "ine"
  | "curp"
  | "csf"
  | "acta_nacimiento"
  | "comprobante_domicilio"
  | "rfc_homoclave"
  | "nss"
  | "contrato"
  | "alta_imss"
  | "examen_medico"
  | "capacitacion_repse"
  | "constancia_repse"
  | "otro";

export const ETIQUETA_TIPO_DOC: Record<TipoDocumentoEmpleado, string> = {
  ine: "INE / IFE",
  curp: "CURP",
  csf: "Constancia de Situación Fiscal",
  acta_nacimiento: "Acta de nacimiento",
  comprobante_domicilio: "Comprobante de domicilio",
  rfc_homoclave: "RFC con homoclave",
  nss: "Constancia NSS",
  contrato: "Contrato laboral",
  alta_imss: "Alta IMSS",
  examen_medico: "Examen médico",
  capacitacion_repse: "Capacitación REPSE",
  constancia_repse: "Constancia REPSE",
  otro: "Otro",
};

// Estados de form actions
export type VacacionState = {
  ok: boolean;
  error: string | null;
};
export const initialVacacionState: VacacionState = { ok: false, error: null };

export type ViaticoState = {
  ok: boolean;
  error: string | null;
  viaticoId: string | null;
};
export const initialViaticoState: ViaticoState = {
  ok: false,
  error: null,
  viaticoId: null,
};

/**
 * Tabla LFT 2023+ — días anuales de vacaciones según años de antigüedad.
 */
export function diasVacacionesLft(
  fechaIngreso: Date | string,
  fechaCorte: Date = new Date(),
): number {
  const ingreso =
    typeof fechaIngreso === "string" ? new Date(fechaIngreso) : fechaIngreso;
  const ms = fechaCorte.getTime() - ingreso.getTime();
  const anios = Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
  if (anios < 1) {
    // Proporcional al primer año
    const dias = Math.floor(
      (12 * (fechaCorte.getTime() - ingreso.getTime())) /
        (1000 * 60 * 60 * 24 * 365.25),
    );
    return Math.max(0, dias);
  }
  if (anios === 1) return 12;
  if (anios === 2) return 14;
  if (anios === 3) return 16;
  if (anios === 4) return 18;
  if (anios === 5) return 20;
  if (anios <= 10) return 22;
  if (anios <= 15) return 24;
  if (anios <= 20) return 26;
  if (anios <= 25) return 28;
  if (anios <= 30) return 30;
  return 32;
}
