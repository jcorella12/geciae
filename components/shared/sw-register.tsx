"use client";

import { useEffect } from "react";

/**
 * Registra el Service Worker para que la PWA funcione offline.
 * Solo en producción para no interferir con HMR de dev.
 */
export function SWRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    // Registro silencioso, sin bloquear render
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Silenciar — el SW es best-effort
      });
  }, []);
  return null;
}
