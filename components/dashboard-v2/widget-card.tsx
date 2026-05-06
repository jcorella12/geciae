"use client";

import { GripVertical, MoreVertical, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  cambiarTamanoWidget,
  ocultarWidget,
} from "@/app/(app)/dashboard/widget-actions";
import type { TamanoWidget } from "@/lib/dashboard-widgets/catalogo";

export const TAMANO_CLASES: Record<TamanoWidget, string> = {
  small: "md:col-span-3",
  medium: "md:col-span-4",
  large: "md:col-span-6",
  full: "md:col-span-12",
};

const TAMANO_LABEL: Record<TamanoWidget, string> = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
  full: "Completo",
};

export function WidgetCard({
  widgetId,
  titulo,
  tamano,
  tamanosPermitidos,
  draggable = true,
  onTamanoCambio,
  children,
}: {
  widgetId: string;
  titulo: string;
  tamano: TamanoWidget;
  tamanosPermitidos: TamanoWidget[];
  draggable?: boolean;
  onTamanoCambio?: (nuevo: TamanoWidget) => void;
  children: ReactNode;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMenu) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showMenu]);

  return (
    <div
      className={cn(
        "group relative col-span-12 overflow-hidden rounded-md border border-border bg-card shadow-xs transition-shadow hover:shadow-sm",
        TAMANO_CLASES[tamano],
      )}
    >
      {/* Toolbar */}
      <div className="absolute right-2 top-2 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {draggable && (
          <button
            type="button"
            className="rounded p-1 text-ink-3 hover:bg-bg-2 hover:text-ink-1"
            aria-label="Arrastrar"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3" />
          </button>
        )}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="rounded p-1 text-ink-3 hover:bg-bg-2 hover:text-ink-1"
            onClick={() => setShowMenu((v) => !v)}
            aria-label="Opciones del widget"
          >
            <MoreVertical className="h-3 w-3" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-7 z-20 min-w-[160px] rounded-md border border-border bg-card p-1 shadow-md">
              <p className="mb-0.5 px-2 pt-1 text-[10.5px] font-medium uppercase tracking-wide text-ink-3">
                Tamaño
              </p>
              {tamanosPermitidos.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={async () => {
                    if (onTamanoCambio) onTamanoCambio(t);
                    else await cambiarTamanoWidget(widgetId, t);
                    setShowMenu(false);
                  }}
                  className={cn(
                    "block w-full rounded px-2 py-1 text-left text-[12px] hover:bg-bg-2",
                    tamano === t && "bg-bg-2 font-medium",
                  )}
                >
                  {TAMANO_LABEL[t]}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={async () => {
            if (
              window.confirm(`¿Ocultar widget "${titulo}"? Lo puedes reactivar desde "+ Agregar widget".`)
            ) {
              await ocultarWidget(widgetId);
            }
          }}
          className="rounded p-1 text-ink-3 hover:bg-danger/10 hover:text-danger"
          aria-label="Ocultar widget"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Contenido */}
      <div className="h-full p-5">{children}</div>
    </div>
  );
}
