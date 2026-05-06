"use client";

import {
  ChevronDown,
  LayoutGrid,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useState, useTransition } from "react";

import {
  aplicarPlantilla,
  restablecerLayout,
  toggleModoCompacto,
} from "@/app/(app)/dashboard/widget-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AtributoUsuario } from "@/lib/auth/permisos";
import {
  VISTAS_LABEL,
  type LayoutEntry,
  type VistaPlantilla,
} from "@/lib/dashboard-widgets/catalogo";

import { WidgetPicker } from "./widget-picker";

/**
 * Barra superior del dashboard con controles de personalización.
 * Mostrar/agregar widgets, toggle compacto, plantilla rápida, restablecer.
 */
export function DashboardToolbar({
  modoCompacto,
  vistaActiva,
  layout,
  atributosUsuario,
}: {
  modoCompacto: boolean;
  vistaActiva: VistaPlantilla;
  layout: LayoutEntry[];
  atributosUsuario: AtributoUsuario[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-[12px] text-ink-3">
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>
            Vista{" "}
            <span className="font-medium text-ink-1">
              {VISTAS_LABEL[vistaActiva]}
            </span>
          </span>
          {modoCompacto && (
            <span className="rounded bg-bg-2 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-2">
              Compacto
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => void toggleModoCompacto())}
            className="gap-1.5"
            title={modoCompacto ? "Cambiar a modo detallado" : "Cambiar a modo compacto"}
          >
            {modoCompacto ? (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Detallado</span>
              </>
            ) : (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Compacto</span>
              </>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Plantilla</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => startTransition(() => void aplicarPlantilla("ceo"))}
              >
                Vista CEO
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  startTransition(() => void aplicarPlantilla("director"))
                }
              >
                Vista Director
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  startTransition(() => void aplicarPlantilla("contralor"))
                }
              >
                Vista Contralor
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  startTransition(() => void aplicarPlantilla("operativo"))
                }
              >
                Vista Operativo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="default"
            size="sm"
            onClick={() => setPickerOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Agregar widget</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Más opciones">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Restablecer layout? Se borran tus preferencias y vuelve al default por rol.",
                    )
                  ) {
                    startTransition(() => void restablecerLayout());
                  }
                }}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Restablecer layout
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-[11px] text-ink-3">
                💡 Arrastra widgets para reordenar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <WidgetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        layout={layout}
        atributosUsuario={atributosUsuario}
      />
    </>
  );
}
