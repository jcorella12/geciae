"use client";

import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  VISTA_CONSOLIDADA,
  type EmpresaResumen,
} from "@/lib/empresa-activa";
import { cn } from "@/lib/utils";

import { switchEmpresa } from "@/app/(app)/actions";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

type Props = {
  empresas: EmpresaResumen[];
  activaId: string | null;
  puedeConsolidado: boolean;
  /** Modo compacto cuando el sidebar está colapsado a iconos. */
  collapsed?: boolean;
};

/**
 * Switcher de empresa diseñado para vivir DENTRO del sidebar oscuro.
 * Setea `data-empresa` en `<html>` al cambiar para que `--brand` rebindee.
 */
export function SidebarEmpresaSwitcher({
  empresas,
  activaId,
  puedeConsolidado,
  collapsed = false,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const enConsolidado = activaId === VISTA_CONSOLIDADA;
  const empresaActiva = enConsolidado
    ? null
    : empresas.find((e) => e.id === activaId) ?? empresas[0] ?? null;

  if (empresas.length === 0) {
    return (
      <div className="mx-3 my-2 rounded-md border border-white/10 px-3 py-2 text-xs text-white/60">
        Sin empresa asignada
      </div>
    );
  }

  const onSelect = (value: string) => {
    if (value === activaId) return;
    startTransition(() => {
      void switchEmpresa(value);
    });
  };

  // Vista compacta: solo el dot/globo de empresa activa, sin label ni chevron.
  const titulo = enConsolidado
    ? "Vista consolidada del grupo"
    : empresaActiva?.nombre_comercial ?? empresaActiva?.razon_social ?? "—";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          collapsed
            ? "mx-auto my-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            : "mx-3 mt-3 flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          isPending && "opacity-60",
        )}
        aria-label={
          collapsed
            ? `Empresa activa: ${titulo}. Click para cambiar.`
            : "Cambiar empresa activa"
        }
        title={collapsed ? titulo : undefined}
      >
        {enConsolidado ? (
          <Globe
            className={cn(
              "shrink-0 text-white/60",
              collapsed ? "h-3.5 w-3.5 text-white/70" : "h-3 w-3",
            )}
          />
        ) : (
          <span
            className={cn(
              "inline-block shrink-0 rounded-full",
              collapsed ? "h-2.5 w-2.5" : "h-2 w-2",
              codigoColor[empresaActiva?.codigo ?? ""] ?? "bg-white/40",
            )}
          />
        )}
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/55">
                Empresa activa
              </span>
              <span className="block truncate text-[13px] font-medium text-white">
                {enConsolidado
                  ? "Vista consolidada"
                  : empresaActiva?.nombre_comercial ??
                    empresaActiva?.razon_social ??
                    "—"}
              </span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-white/55" />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[16rem]">
        <DropdownMenuLabel>Empresa activa</DropdownMenuLabel>

        {puedeConsolidado && (
          <>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onSelect(VISTA_CONSOLIDADA);
              }}
              className="gap-3"
            >
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">Vista consolidada del grupo</span>
              {enConsolidado && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {empresas.map((e) => {
          const seleccionada = !enConsolidado && empresaActiva?.id === e.id;
          return (
            <DropdownMenuItem
              key={e.id}
              onSelect={(ev) => {
                ev.preventDefault();
                onSelect(e.id);
              }}
              className="gap-3"
            >
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                  codigoColor[e.codigo] ?? "bg-muted-foreground",
                )}
              />
              <span className="flex-1 truncate">
                {e.nombre_comercial ?? e.razon_social}
              </span>
              {seleccionada && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
