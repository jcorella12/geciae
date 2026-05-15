import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Contexto request-scoped para señalar que una llamada a las server actions
 * de SAT viene de un Vercel Cron y debe saltarse `exigirPermiso` (que
 * busca un usuario autenticado en cookies, cosa que no existe en un cron).
 *
 * Uso:
 *   await cronContext.run({ isCron: true }, async () => {
 *     await verificarPendientesEnBloque();
 *   });
 *
 * No exportar desde un archivo "use server" — solo funciones async pueden
 * exportarse de esos. Por eso vive en `lib/sat/`.
 */
export const cronContext = new AsyncLocalStorage<{ isCron: true }>();

export function isRunningInCron(): boolean {
  return cronContext.getStore()?.isCron === true;
}
