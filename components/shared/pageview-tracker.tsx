"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { registrarEventoUso } from "@/lib/eventos-uso/actions";

/**
 * Registra un evento `pageview` cada vez que cambia el pathname.
 *
 * Privacy-first:
 * - Solo path (sin query params, sin hash)
 * - No envía referrer, viewport, ni datos de identidad fuera del usuario_id
 *   que ya conoce la sesión
 * - Si falla la inserción (RLS, red), se ignora silenciosamente
 *
 * Se monta una sola vez en el layout (app)/layout.tsx; no renderiza nada.
 */
export function PageviewTracker() {
  const pathname = usePathname();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastTrackedRef.current === pathname) return;
    lastTrackedRef.current = pathname;
    // No esperamos al resultado; best-effort
    void registrarEventoUso({
      tipo: "pageview",
      pagina: pathname,
    });
  }, [pathname]);

  return null;
}
