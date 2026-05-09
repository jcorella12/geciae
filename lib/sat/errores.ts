/**
 * Sprint 8 — Mapeo de errores comunes del SAT a mensajes accionables en español.
 */

export function interpretarErrorSat(error: string): string {
  const e = error.toLowerCase();
  if (e.includes("305") || e.includes("token")) {
    return "Token de autenticación expiró. Reintenta la operación.";
  }
  if (e.includes("5002")) {
    return "Ya existe una solicitud activa con los mismos parámetros. Espera a que termine o cambia las fechas.";
  }
  if (e.includes("5004")) {
    return "Sin información disponible para los criterios. Período sin CFDIs o muy reciente.";
  }
  if (e.includes("5005")) {
    return "Solicitud duplicada. Ya pediste lo mismo recientemente.";
  }
  if (e.includes("404")) {
    return "Servicio del SAT no disponible temporalmente. Intenta en 30 minutos.";
  }
  if (e.includes("timeout")) {
    return "El SAT no respondió a tiempo. El servicio puede estar lento. Reintenta.";
  }
  if (e.includes("certificate") || e.includes("certificado")) {
    return "Problema con el certificado FIEL. Verifica que esté vigente y bien cargado.";
  }
  return error;
}
