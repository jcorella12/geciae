"use client";

import { Settings2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  CATALOGO_WIDGETS,
  type WidgetLayout,
} from "@/lib/widgets/catalogo";

import { guardarLayout, restablecerRecomendado } from "@/app/(app)/mi-dia/widget-actions";

export function WidgetCustomizer({
  pagina,
  layoutInicial,
}: {
  pagina: "mi-dia" | "dashboard";
  layoutInicial: WidgetLayout;
}) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<WidgetLayout>(layoutInicial);
  const [pending, startTransition] = useTransition();

  const disponibles = CATALOGO_WIDGETS.filter(
    (w) => w.pagina === pagina || w.pagina === "ambas",
  );

  function toggleVisible(widgetId: string) {
    const existe = layout.find((l) => l.widget_id === widgetId);
    let nuevo: WidgetLayout;
    if (existe) {
      nuevo = layout.map((l) =>
        l.widget_id === widgetId ? { ...l, visible: !l.visible } : l,
      );
    } else {
      const meta = disponibles.find((w) => w.id === widgetId);
      nuevo = [
        ...layout,
        {
          widget_id: widgetId,
          orden: layout.length,
          visible: true,
          tamaño: meta?.tamañoDefault ?? "medium",
        },
      ];
    }
    setLayout(nuevo);
    startTransition(async () => {
      await guardarLayout(pagina, nuevo);
    });
  }

  async function restablecer() {
    if (!confirm("¿Restablecer al layout recomendado por tu rol? Se sobreescribirá tu personalización.")) return;
    startTransition(async () => {
      await restablecerRecomendado(pagina);
      window.location.reload();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="h-3.5 w-3.5" />
        Personalizar
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Personalizar widgets</h2>
                <p className="text-[12px] text-ink-3">
                  Marca los que quieres ver en {pagina === "mi-dia" ? "Mi día" : "Dashboard"}.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={restablecer} disabled={pending}>
                Restablecer
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {disponibles.map((w) => {
                const visible = layout.some(
                  (l) => l.widget_id === w.id && l.visible,
                );
                return (
                  <label
                    key={w.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm transition ${
                      visible
                        ? "border-emerald-300 bg-emerald-50/40"
                        : "border-border bg-bg-2/40 hover:bg-bg-2"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={visible}
                      disabled={pending}
                      onChange={() => toggleVisible(w.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{w.nombre}</p>
                      <p className="mt-0.5 text-[11px] text-ink-3">{w.descripcion}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={() => setOpen(false)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
