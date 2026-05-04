/**
 * Estados de archivado para clientes y proveedores.
 *
 * Se introduce en sprint 1.5 para limpiar la vista activa sin perder los
 * datos históricos importados (10 años de operación).
 *
 * Migration: supabase/migrations/20260519000000_estado_clientes_proveedores.sql
 */

export type EstadoEntidad = "activo" | "inactivo" | "archivado";

export const ESTADOS_ENTIDAD: EstadoEntidad[] = [
  "activo",
  "inactivo",
  "archivado",
];

export const ETIQUETA_ESTADO: Record<EstadoEntidad, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  archivado: "Archivado",
};

export const COLOR_ESTADO: Record<EstadoEntidad, string> = {
  activo: "bg-emerald-100 text-emerald-700",
  inactivo: "bg-amber-100 text-amber-700",
  archivado: "bg-zinc-100 text-zinc-600",
};

/** Estado de un Server Action de archivado/desarchivado. */
export type ArchivadoState = {
  ok: boolean;
  error: string | null;
  count?: number;
};

export const initialArchivadoState: ArchivadoState = {
  ok: false,
  error: null,
};
