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
   * ON por defecto (opt-out): V2 es ahora el dashboard principal por ser mucho
   * más simple (widgets por rol, ~84 líneas vs 1.514 de V1). V1 se conserva como
   * respaldo: para volver a él poner NEXT_PUBLIC_DASHBOARD_V2=false.
   * Una vez validado V2 con usuarios reales, eliminar page-v1.tsx y este flag.
   */
  DASHBOARD_V2: process.env.NEXT_PUBLIC_DASHBOARD_V2 !== "false",
} as const;

export type FeatureFlag = keyof typeof FEATURES;
