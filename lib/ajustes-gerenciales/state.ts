/**
 * Sprint S — Ajustes Gerenciales
 *
 * Tipos compartidos para el módulo de ajustes gerenciales (capa paralela
 * a la contabilidad fiscal). Acceso restringido a CEO + contralor +
 * tesorero_corporativo.
 */

export type TipoAjusteGerencial =
  | "inventario_gastado_existente"
  | "construccion_remodelacion_oficina"
  | "equipo_herramienta_gastado"
  | "prestamo_personal_negocio"
  | "aportacion_no_formalizada";

export type NaturalezaAjuste = "activo" | "pasivo" | "capital";

export type EstadoAjusteGerencial =
  | "borrador"
  | "vigente"
  | "regularizado"
  | "cancelado";

export type ContraparteRelacion = "fundador" | "socio" | "familiar" | "tercero";

export type TipoDocumentoAjuste =
  | "factura_origen"
  | "foto_activo"
  | "pagare"
  | "evidencia_aportacion"
  | "avaluo"
  | "otro";

export type AccionAuditAjuste =
  | "visualizacion_lista"
  | "visualizacion_detalle"
  | "visualizacion_dual"
  | "crear"
  | "actualizar"
  | "cancelar"
  | "regularizar"
  | "agregar_documento"
  | "eliminar_documento"
  | "exportar_excel";

// ----------------------------------------------------------------------------
// Etiquetas legibles
// ----------------------------------------------------------------------------

export const ETIQUETA_TIPO_AJUSTE: Record<TipoAjusteGerencial, string> = {
  inventario_gastado_existente: "Inventario gastado pero existente",
  construccion_remodelacion_oficina: "Construcción / remodelación oficina",
  equipo_herramienta_gastado: "Equipo o herramienta como gasto",
  prestamo_personal_negocio: "Préstamo personal al negocio",
  aportacion_no_formalizada: "Aportación no formalizada",
};

export const DESCRIPCION_TIPO_AJUSTE: Record<TipoAjusteGerencial, string> = {
  inventario_gastado_existente:
    "Material o producto comprado vía OC con concepto de gasto pero que físicamente sigue en almacén",
  construccion_remodelacion_oficina:
    "Contenedores como estructura, remodelación interna, acondicionamiento que se registró como gasto",
  equipo_herramienta_gastado:
    "Herramientas, computadoras, mobiliario, equipo menor que entra como gasto pero dura años",
  prestamo_personal_negocio:
    "Dinero del fundador o socios que financia operación pero no está como pasivo formal",
  aportacion_no_formalizada:
    "Capital aportado en efectivo o especie sin trámite ante notario",
};

export const NATURALEZA_POR_TIPO: Record<TipoAjusteGerencial, NaturalezaAjuste> = {
  inventario_gastado_existente: "activo",
  construccion_remodelacion_oficina: "activo",
  equipo_herramienta_gastado: "activo",
  prestamo_personal_negocio: "pasivo",
  aportacion_no_formalizada: "capital",
};

export const ETIQUETA_ESTADO_AJUSTE: Record<EstadoAjusteGerencial, string> = {
  borrador: "Borrador",
  vigente: "Vigente",
  regularizado: "Regularizado",
  cancelado: "Cancelado",
};

export const COLOR_ESTADO_AJUSTE: Record<EstadoAjusteGerencial, string> = {
  borrador: "bg-amber-100 text-amber-800",
  vigente: "bg-emerald-100 text-emerald-800",
  regularizado: "bg-sky-100 text-sky-800",
  cancelado: "bg-gray-100 text-gray-500",
};

export const ETIQUETA_NATURALEZA: Record<NaturalezaAjuste, string> = {
  activo: "Activo",
  pasivo: "Pasivo",
  capital: "Capital",
};

export const ETIQUETA_TIPO_DOCUMENTO: Record<TipoDocumentoAjuste, string> = {
  factura_origen: "Factura de origen",
  foto_activo: "Foto del activo",
  pagare: "Pagaré",
  evidencia_aportacion: "Evidencia de aportación",
  avaluo: "Avalúo",
  otro: "Otro",
};

export const ETIQUETA_CONTRAPARTE: Record<ContraparteRelacion, string> = {
  fundador: "Fundador",
  socio: "Socio",
  familiar: "Familiar",
  tercero: "Tercero",
};

/** Vidas útiles sugeridas (años) por tipo. */
export const VIDA_UTIL_SUGERIDA: Partial<Record<TipoAjusteGerencial, number>> = {
  construccion_remodelacion_oficina: 20,
  equipo_herramienta_gastado: 5,
};

/** Tipos que requieren campo "vida útil" en el form. */
export const TIPOS_CON_VIDA_UTIL: TipoAjusteGerencial[] = [
  "construccion_remodelacion_oficina",
  "equipo_herramienta_gastado",
];

/** Tipos que requieren contraparte (préstamos, aportaciones). */
export const TIPOS_CON_CONTRAPARTE: TipoAjusteGerencial[] = [
  "prestamo_personal_negocio",
  "aportacion_no_formalizada",
];

/** Tipos que pueden vincularse a una OC origen. */
export const TIPOS_CON_OC_ORIGEN: TipoAjusteGerencial[] = [
  "inventario_gastado_existente",
  "construccion_remodelacion_oficina",
  "equipo_herramienta_gastado",
];

// ----------------------------------------------------------------------------
// Tipos de fila
// ----------------------------------------------------------------------------

export type AjusteGerencial = {
  id: string;
  codigo: string;
  empresa_id: string;
  tipo: TipoAjusteGerencial;
  naturaleza: NaturalezaAjuste;
  descripcion: string;
  valor: number;
  fecha_adquisicion: string;
  fecha_registro: string;
  vida_util_anios: number | null;
  valor_residual_pct: number;
  justificacion: string;
  oc_origen_id: string | null;
  cfdi_origen_id: string | null;
  observaciones_origen: string | null;
  contraparte_nombre: string | null;
  contraparte_relacion: ContraparteRelacion | null;
  estado: EstadoAjusteGerencial;
  regularizado_fecha: string | null;
  regularizado_observaciones: string | null;
  registrado_por: string;
  modificado_por: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  // Campos calculados (vista enriquecida)
  empresa_codigo?: string;
  empresa_nombre?: string;
  valor_en_libros?: number;
  num_documentos?: number;
  registrado_por_email?: string;
};

export type DocumentoAjuste = {
  id: string;
  ajuste_id: string;
  tipo_documento: TipoDocumentoAjuste;
  nombre: string;
  url: string;
  fecha_documento: string | null;
  observaciones: string | null;
  subido_por: string;
  created_at: string;
};

export type AuditEntryAjuste = {
  id: string;
  usuario_id: string;
  accion: AccionAuditAjuste;
  ajuste_id: string | null;
  detalles: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type AjusteTotalesRow = {
  empresa_id: string;
  naturaleza: NaturalezaAjuste;
  tipo: TipoAjusteGerencial;
  num_ajustes: number;
  valor_total: number;
  valor_en_libros_total: number;
};

export type ResumenAjustesGrupo = {
  total_activos_ocultos: number;
  total_pasivos_no_registrados: number;
  total_capital_no_formalizado: number;
  num_ajustes_vigentes: number;
  num_ajustes_borrador: number;
};
