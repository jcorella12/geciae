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
  activaId: string | null; // UUID o VISTA_CONSOLIDADA
  puedeConsolidado: boolean;
};

export function EmpresaSwitcher({
  empresas,
  activaId,
  puedeConsolidado,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const enConsolidado = activaId === VISTA_CONSOLIDADA;
  const empresaActiva = enConsolidado
    ? null
    : empresas.find((e) => e.id === activaId) ?? empresas[0] ?? null;

  if (empresas.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        Sin empresa asignada
      </span>
    );
  }

  const onSelect = (value: string) => {
    if (value === activaId) return;
    startTransition(() => {
      void switchEmpresa(value);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isPending && "opacity-60",
        )}
        aria-label="Cambiar empresa activa"
      >
        {enConsolidado ? (
          <>
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Vista consolidada</span>
          </>
        ) : (
          <>
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                codigoColor[empresaActiva?.codigo ?? ""] ??
                  "bg-muted-foreground",
              )}
            />
            <span>
              {empresaActiva?.nombre_comercial ?? empresaActiva?.razon_social}
            </span>
          </>
        )}
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
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
              {enConsolidado && (
                <Check className="h-4 w-4 text-primary" />
              )}
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
              {seleccionada && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
