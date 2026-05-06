/**
 * Feature flags del cliente / servidor.
 *
 * Se evalúan al cargar el módulo. Para cambiarlas en producción, ajustar las
 * variables de entorno y reiniciar. Las flags `NEXT_PUBLIC_*` son visibles en
 * cliente; las que no, solo en server.
 *
 * Convención: cada flag debe documentar el sprint que la introdujo y la
 * fecha tentativa para retirarla (default off → on por defecto → eliminar).
 */

export const FEATURES = {
  /**
   * Sprint Z.1.5 — Dashboard configurable con widgets, plantillas y modo compacto.
   * Off por defecto durante el rollout para preservar el dashboard v1 mientras
   * se valida con usuarios reales. Para activar: NEXT_PUBLIC_DASHBOARD_V2=true.
   */
  DASHBOARD_V2: process.env.NEXT_PUBLIC_DASHBOARD_V2 === "true",
} as const;

export type FeatureFlag = keyof typeof FEATURES;
