"use client";

import { useEffect, useState } from "react";

/**
 * Hook que rastrea el estado de conexión del navegador.
 *
 * Usa `navigator.onLine` + eventos `online`/`offline` (estándar HTML5).
 * `navigator.onLine` puede dar falsos positivos (la API es heurística:
 * dice "online" si hay conexión a una red, no si Internet realmente
 * funciona). Para crítico usar un health-check ping (ver `useOnlineHealth`).
 *
 * Retorna `true` si online (default mientras se monta para evitar flicker).
 *
 * Uso:
 * ```tsx
 * const online = useOnline();
 * if (!online) return <OfflineBanner />;
 * ```
 */
export function useOnline(): boolean {
  // Default true: optimistic. Si arrancamos en SSR no tenemos navigator.
  // En cliente, el useEffect actualiza al estado real.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);

    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  return online;
}
