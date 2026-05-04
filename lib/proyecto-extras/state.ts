// Tipos compartidos para Bitácora / Documentos / Equipo de proyecto.

// ===== Bitácora =====
export type TipoEventoBitacora =
  | "avance"
  | "problema"
  | "decision"
  | "visita"
  | "foto"
  | "hito_alcanzado"
  | "cambio_alcance"
  | "reunion"
  | "nota";

export const ETIQUETA_TIPO_BITACORA: Record<TipoEventoBitacora, string> = {
  avance: "Avance",
  problema: "Problema",
  decision: "Decisión",
  visita: "Visita a obra",
  foto: "Foto / evidencia",
  hito_alcanzado: "Hito alcanzado",
  cambio_alcance: "Cambio de alcance",
  reunion: "Reunión",
  nota: "Nota",
};

export const COLOR_TIPO_BITACORA: Record<TipoEventoBitacora, string> = {
  avance: "bg-emerald-100 text-emerald-700",
  problema: "bg-red-100 text-red-700",
  decision: "bg-violet-100 text-violet-700",
  visita: "bg-sky-100 text-sky-700",
  foto: "bg-amber-100 text-amber-700",
  hito_alcanzado: "bg-emerald-100 text-emerald-800",
  cambio_alcance: "bg-orange-100 text-orange-700",
  reunion: "bg-blue-100 text-blue-700",
  nota: "bg-gray-100 text-gray-700",
};

export const ICONO_TIPO_BITACORA: Record<TipoEventoBitacora, string> = {
  avance: "📈",
  problema: "⚠️",
  decision: "🎯",
  visita: "🏗️",
  foto: "📸",
  hito_alcanzado: "🏆",
  cambio_alcance: "🔄",
  reunion: "🤝",
  nota: "📝",
};

// ===== Documentos =====
export type CategoriaDocProyecto =
  | "contrato"
  | "plano"
  | "especificacion"
  | "diseno"
  | "cotizacion"
  | "foto"
  | "manual"
  | "permiso"
  | "acta"
  | "otro";

export const ETIQUETA_CATEGORIA_DOC: Record<CategoriaDocProyecto, string> = {
  contrato: "Contrato",
  plano: "Plano",
  especificacion: "Especificación",
  diseno: "Diseño",
  cotizacion: "Cotización",
  foto: "Foto",
  manual: "Manual",
  permiso: "Permiso",
  acta: "Acta",
  otro: "Otro",
};

export const COLOR_CATEGORIA_DOC: Record<CategoriaDocProyecto, string> = {
  contrato: "bg-violet-100 text-violet-700",
  plano: "bg-blue-100 text-blue-700",
  especificacion: "bg-sky-100 text-sky-700",
  diseno: "bg-cyan-100 text-cyan-700",
  cotizacion: "bg-amber-100 text-amber-700",
  foto: "bg-emerald-100 text-emerald-700",
  manual: "bg-zinc-100 text-zinc-700",
  permiso: "bg-orange-100 text-orange-700",
  acta: "bg-indigo-100 text-indigo-700",
  otro: "bg-gray-100 text-gray-700",
};

// ===== Equipo =====
export type RolProyecto =
  | "pm"
  | "vendedor"
  | "supervisor_obra"
  | "ingeniero_diseno"
  | "ingeniero_electrico"
  | "instalador"
  | "soporte"
  | "admin_proyecto"
  | "cliente_contacto"
  | "observador";

export const ETIQUETA_ROL_PROYECTO: Record<RolProyecto, string> = {
  pm: "Project Manager",
  vendedor: "Vendedor",
  supervisor_obra: "Supervisor obra",
  ingeniero_diseno: "Ingeniero diseño",
  ingeniero_electrico: "Ingeniero eléctrico",
  instalador: "Instalador",
  soporte: "Soporte",
  admin_proyecto: "Admin proyecto",
  cliente_contacto: "Contacto cliente",
  observador: "Observador",
};

export const COLOR_ROL_PROYECTO: Record<RolProyecto, string> = {
  pm: "bg-violet-100 text-violet-700",
  vendedor: "bg-amber-100 text-amber-700",
  supervisor_obra: "bg-orange-100 text-orange-700",
  ingeniero_diseno: "bg-blue-100 text-blue-700",
  ingeniero_electrico: "bg-cyan-100 text-cyan-700",
  instalador: "bg-emerald-100 text-emerald-700",
  soporte: "bg-sky-100 text-sky-700",
  admin_proyecto: "bg-indigo-100 text-indigo-700",
  cliente_contacto: "bg-pink-100 text-pink-700",
  observador: "bg-gray-100 text-gray-600",
};

// ===== Estados de form =====
export type SimpleFormState = { ok: boolean; error: string | null };
export const initialSimpleFormState: SimpleFormState = {
  ok: false,
  error: null,
};
