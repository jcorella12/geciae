"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const CLASS = "sidebar-mobile-open";

/**
 * Drawer para la sidebar en móvil — escucha la clase `sidebar-mobile-open`
 * que el botón "Más" del BottomNav togglea en `<html>`.
 *
 * Renderiza la AppSidebar pasada como children dentro de un panel fijo a la
 * izquierda con animación de slide. Añade backdrop oscuro que cierra el
 * drawer al tap fuera, y se cierra automático al navegar o al pulsar ESC.
 *
 * En desktop (md+) no hace nada — la sidebar normal se muestra al lado.
 */
export function MobileSidebarDrawer({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Sincroniza con la clase en <html> (la togglea BottomNav).
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setOpen(html.classList.contains(CLASS));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Cierra al cambiar de ruta (touch en un link de la sidebar).
  useEffect(() => {
    document.documentElement.classList.remove(CLASS);
  }, [pathname]);

  // Cierra con ESC (teclado en tablet con keyboard).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Bloquea scroll del body cuando está abierto.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  function close() {
    document.documentElement.classList.remove(CLASS);
  }

  return (
    <div className="md:hidden">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      {/* Panel deslizante con la sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!open}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label="Navegación principal"
      >
        {children}
      </div>
    </div>
  );
}
