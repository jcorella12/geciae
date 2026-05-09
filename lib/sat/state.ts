/**
 * Sprint 8 — Tipos compartidos del módulo SAT.
 */

export type EstadoFiel = "activa" | "vencida" | "revocada" | "archivada";

export type TipoDescargaSat = "emitidos" | "recibidos";

export type EstadoDescargaSat =
  | "borrador"
  | "solicitada"
  | "verificando"
  | "lista_descargar"
  | "descargando"
  | "descargada"
  | "procesando"
  | "completada"
  | "error"
  | "expirada";

export type FielEnriquecida = {
  id: string;
  empresa_id: string;
  empresa_codigo: string;
  empresa_nombre: string | null;
  rfc: string;
  numero_serie: string;
  vigencia_desde: string;
  vigencia_hasta: string;
  estatus_vigencia: "vencida" | "por_vencer" | "vigente";
  dias_restantes: number;
  estado: EstadoFiel;
  veces_usada: number;
  ultima_validacion_at: string | null;
  created_at: string;
};

export type DescargaSat = {
  id: string;
  empresa_id: string;
  tipo_descarga: TipoDescargaSat;
  fecha_inicio: string;
  fecha_fin: string;
  sat_request_id: string | null;
  sat_package_ids: string[] | null;
  numero_cfdis_estimados: number | null;
  estado: EstadoDescargaSat;
  intentos_verificacion: number;
  ultima_verificacion_at: string | null;
  cfdis_descargados: number;
  cfdis_importados: number;
  cfdis_duplicados: number;
  cfdis_con_error: number;
  paquetes_storage_paths: string[] | null;
  error_mensaje: string | null;
  iniciada_por: string;
  iniciada_at: string;
  completada_at: string | null;
  duracion_segundos: number | null;
  created_at: string;
  empresas?: { codigo: string; nombre_comercial: string | null } | null;
};

export const ETIQUETA_ESTADO_DESCARGA: Record<EstadoDescargaSat, string> = {
  borrador: "Borrador",
  solicitada: "Solicitada al SAT",
  verificando: "Verificando",
  lista_descargar: "Lista para descargar",
  descargando: "Descargando paquetes",
  descargada: "Paquetes descargados",
  procesando: "Procesando XMLs",
  completada: "Completada",
  error: "Error",
  expirada: "Expirada (>72h)",
};

export const COLOR_ESTADO_DESCARGA: Record<EstadoDescargaSat, string> = {
  borrador: "bg-bg-2 text-ink-2",
  solicitada: "bg-sky-100 text-sky-800",
  verificando: "bg-sky-100 text-sky-800",
  lista_descargar: "bg-blue-100 text-blue-800",
  descargando: "bg-amber-100 text-amber-800",
  descargada: "bg-amber-100 text-amber-800",
  procesando: "bg-amber-100 text-amber-800",
  completada: "bg-emerald-100 text-emerald-800",
  error: "bg-red-100 text-red-800",
  expirada: "bg-red-100 text-red-800",
};
