/**
 * Constantes y tipos para Sugerencias de mejora (Sprint 5.1).
 */

export type CategoriaSugerencia =
  | "bug"
  | "mejora_ux"
  | "feature_nuevo"
  | "rendimiento"
  | "otro";

export type EstadoSugerencia =
  | "nueva"
  | "en_revision"
  | "planeada"
  | "implementada"
  | "descartada";

export const ETIQUETA_CATEGORIA: Record<CategoriaSugerencia, string> = {
  bug: "Bug / error",
  mejora_ux: "Mejora de UX",
  feature_nuevo: "Nuevo feature",
  rendimiento: "Rendimiento",
  otro: "Otro",
};

export const COLOR_CATEGORIA: Record<CategoriaSugerencia, string> = {
  bug: "bg-red-100 text-red-700",
  mejora_ux: "bg-blue-100 text-blue-700",
  feature_nuevo: "bg-violet-100 text-violet-700",
  rendimiento: "bg-amber-100 text-amber-700",
  otro: "bg-zinc-100 text-zinc-600",
};

export const ETIQUETA_ESTADO: Record<EstadoSugerencia, string> = {
  nueva: "Nueva",
  en_revision: "En revisión",
  planeada: "Planeada",
  implementada: "Implementada",
  descartada: "Descartada",
};

export const COLOR_ESTADO: Record<EstadoSugerencia, string> = {
  nueva: "bg-blue-100 text-blue-700",
  en_revision: "bg-amber-100 text-amber-700",
  planeada: "bg-violet-100 text-violet-700",
  implementada: "bg-emerald-100 text-emerald-700",
  descartada: "bg-zinc-100 text-zinc-500",
};

export const CATEGORIAS: CategoriaSugerencia[] = [
  "bug",
  "mejora_ux",
  "feature_nuevo",
  "rendimiento",
  "otro",
];

export const ESTADOS: EstadoSugerencia[] = [
  "nueva",
  "en_revision",
  "planeada",
  "implementada",
  "descartada",
];

// ============================================================================
// State para Server Actions
// ============================================================================

export type CrearSugerenciaState = {
  ok: boolean;
  error: string | null;
};

export const initialCrearSugerenciaState: CrearSugerenciaState = {
  ok: false,
  error: null,
};

export type UpdateSugerenciaState = {
  ok: boolean;
  error: string | null;
};

export const initialUpdateSugerenciaState: UpdateSugerenciaState = {
  ok: false,
  error: null,
};
