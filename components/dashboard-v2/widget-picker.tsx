"use client";

import { Check, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { mostrarWidget } from "@/app/(app)/dashboard/widget-actions";
import {
  CATALOGO_WIDGETS,
  CATEGORIAS_LABEL,
  type CategoriaWidget,
  type LayoutEntry,
  type WidgetMetadata,
} from "@/lib/dashboard-widgets/catalogo";
import type { AtributoUsuario } from "@/lib/auth/permisos";
import { cn } from "@/lib/utils";

/**
 * Modal del catálogo de widgets. Permite al usuario activar widgets que no
 * estén ya en su layout. Filtra por atributo requerido y permite buscar
 * por nombre/descripción.
 */
export function WidgetPicker({
  open,
  onClose,
  layout,
  atributosUsuario,
}: {
  open: boolean;
  onClose: () => void;
  layout: LayoutEntry[];
  atributosUsuario: AtributoUsuario[];
}) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const widgetsAccesibles = useMemo<WidgetMetadata[]>(() => {
    return CATALOGO_WIDGETS.filter((w) => {
      if (w.atributoRequerido && !atributosUsuario.includes(w.atributoRequerido)) {
        return false;
      }
      if (query) {
        const q = query.toLowerCase();
        return (
          w.nombre.toLowerCase().includes(q) ||
          w.descripcion.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [query, atributosUsuario]);

  const widgetsPorCategoria = useMemo(() => {
    const grupos = new Map<CategoriaWidget, WidgetMetadata[]>();
    for (const w of widgetsAccesibles) {
      if (!grupos.has(w.categoria)) grupos.set(w.categoria, []);
      grupos.get(w.categoria)!.push(w);
    }
    return grupos;
  }, [widgetsAccesibles]);

  const yaActivo = (id: string) =>
    layout.some((l) => l.widget_id === id && l.visible);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-6 sm:p-12"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-md border border-border bg-card shadow-lg"
        style={{ maxHeight: "calc(100vh - 6rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold leading-tight">
              Agregar widgets a tu dashboard
            </h2>
            <p className="text-[11.5px] text-ink-3">
              Activa los widgets que más te sirvan. Puedes ocultarlos después.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-ink-1"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar widget…"
              className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-[12.5px] outline-none focus:border-brand"
              autoFocus
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-6">
            {Array.from(widgetsPorCategoria.entries()).map(([cat, widgets]) => (
              <div key={cat}>
                <h3 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  {CATEGORIAS_LABEL[cat]}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {widgets.map((w) => {
                    const Icon = w.icon;
                    const activo = yaActivo(w.id);
                    const isPending = pending === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        disabled={activo || isPending}
                        onClick={async () => {
                          if (activo) return;
                          setPending(w.id);
                          await mostrarWidget(w.id);
                          setPending(null);
                        }}
                        className={cn(
                          "flex items-start gap-3 rounded-md border p-3 text-left transition-colors",
                          activo
                            ? "cursor-default border-ok/30 bg-ok/5"
                            : "cursor-pointer border-border hover:border-brand hover:bg-bg-2",
                          isPending && "opacity-60",
                        )}
                      >
                        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-3" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-medium leading-tight">
                              {w.nombre}
                            </span>
                            {w.esHero && (
                              <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-brand">
                                Hero
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-ink-3">
                            {w.descripcion}
                          </p>
                        </div>
                        <div className="mt-0.5 flex-shrink-0">
                          {activo ? (
                            <Check className="h-3.5 w-3.5 text-ok-deep" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 text-ink-3" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {widgetsAccesibles.length === 0 && (
              <p className="text-center text-[12.5px] text-ink-3">
                No se encontraron widgets para «{query}».
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
