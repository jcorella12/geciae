"use client";

import { Layers } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const codigoBg: Record<string, string> = {
  PSE: "bg-pse text-white",
  CIAE: "bg-ciae text-white",
  IED: "bg-ied text-white",
  LIMSON: "bg-limson text-white",
};

const codigoBgSoft: Record<string, string> = {
  PSE: "border-pse/30 text-pse hover:bg-pse/10",
  CIAE: "border-ciae/30 text-ciae hover:bg-ciae/10",
  IED: "border-ied/30 text-ied hover:bg-ied/10",
  LIMSON: "border-limson/30 text-limson hover:bg-limson/10",
};

/**
 * Chips de filtro por empresa + toggle "Agrupar por empresa" para la lista
 * de cuentas bancarias. Estado en URL (searchParams) para que sea
 * compartible y respete back/forward del navegador.
 */
export function CuentasFilters({
  empresas,
  empresaFiltro,
  agrupar,
}: {
  empresas: Array<{ codigo: string; nombre: string }>;
  empresaFiltro: string;
  agrupar: boolean;
}) {
  const sp = useSearchParams();

  // Helper: construye un href preservando otros searchParams.
  const hrefWith = (overrides: Record<string, string | null>) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `?${qs}` : "?";
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link
        href={hrefWith({ empresa: null })}
        className={cn(
          "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
          empresaFiltro === "all"
            ? "border-ink-1 bg-ink-1 text-white"
            : "border-border bg-card text-ink-2 hover:bg-bg-2",
        )}
        aria-pressed={empresaFiltro === "all"}
      >
        Todas
      </Link>
      {empresas.map((e) => {
        const codigo = e.codigo.toUpperCase();
        const active = empresaFiltro === e.codigo.toLowerCase();
        return (
          <Link
            key={e.codigo}
            href={hrefWith({ empresa: e.codigo.toLowerCase() })}
            title={e.nombre}
            className={cn(
              "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
              active
                ? codigoBg[codigo] ?? "border-ink-1 bg-ink-1 text-white"
                : codigoBgSoft[codigo] ??
                    "border-border bg-card text-ink-2 hover:bg-bg-2",
            )}
            aria-pressed={active}
          >
            {codigo}
          </Link>
        );
      })}

      {/* Separador visual */}
      <span aria-hidden className="mx-1 h-5 w-px bg-divider" />

      <Link
        href={hrefWith({ agrupar: agrupar ? null : "1" })}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
          agrupar
            ? "border-brand bg-brand/10 text-brand"
            : "border-border bg-card text-ink-2 hover:bg-bg-2",
        )}
        aria-pressed={agrupar}
      >
        <Layers className="h-3.5 w-3.5" />
        Agrupar por empresa
      </Link>
    </div>
  );
}
