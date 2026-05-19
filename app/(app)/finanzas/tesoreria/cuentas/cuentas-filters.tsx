"use client";

import { ArrowDownAZ, Layers, TrendingDown, TrendingUp } from "lucide-react";
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

type Orden = "empresa" | "banco" | "saldo_desc" | "saldo_asc";

const ORDENES: Array<{
  value: Orden;
  label: string;
  icon: typeof Layers;
  title: string;
}> = [
  {
    value: "empresa",
    label: "Empresa",
    icon: Layers,
    title: "Ordenar por empresa (default; útil para revisar por compañía)",
  },
  {
    value: "saldo_desc",
    label: "Saldo ↓",
    icon: TrendingDown,
    title: "Mayor saldo primero (útil para ver dónde está el dinero)",
  },
  {
    value: "saldo_asc",
    label: "Saldo ↑",
    icon: TrendingUp,
    title: "Menor saldo primero (útil para detectar cuentas que requieren fondeo)",
  },
  {
    value: "banco",
    label: "Banco",
    icon: ArrowDownAZ,
    title: "Alfabético por banco",
  },
];

/**
 * Chips de filtro por empresa + toggle "Agrupar por empresa" + selector de
 * orden para la lista de cuentas bancarias. Estado en URL (searchParams) para
 * que sea compartible y respete back/forward del navegador.
 */
export function CuentasFilters({
  empresas,
  empresaFiltro,
  agrupar,
  orden,
}: {
  empresas: Array<{ codigo: string; nombre: string }>;
  empresaFiltro: string;
  agrupar: boolean;
  orden: Orden;
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
      {/* Filtro por empresa */}
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

      {/* Separador */}
      <span aria-hidden className="mx-1 h-5 w-px bg-divider" />

      {/* Toggle agrupar */}
      <Link
        href={hrefWith({ agrupar: agrupar ? "0" : null })}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
          agrupar
            ? "border-brand bg-brand/10 text-brand"
            : "border-border bg-card text-ink-2 hover:bg-bg-2",
        )}
        aria-pressed={agrupar}
        title={
          agrupar
            ? "Quitar agrupado (lista plana)"
            : "Agrupar por empresa con header"
        }
      >
        <Layers className="h-3.5 w-3.5" />
        Agrupar
      </Link>

      {/* Separador */}
      <span aria-hidden className="mx-1 h-5 w-px bg-divider" />

      {/* Selector de orden */}
      <span className="text-[11px] text-ink-3">Orden:</span>
      {ORDENES.map((o) => {
        const Icon = o.icon;
        const active = orden === o.value;
        return (
          <Link
            key={o.value}
            href={hrefWith({
              orden: o.value === "empresa" ? null : o.value,
            })}
            title={o.title}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
              active
                ? "border-ink-1 bg-ink-1 text-white"
                : "border-border bg-card text-ink-2 hover:bg-bg-2",
            )}
            aria-pressed={active}
          >
            <Icon className="h-3 w-3" />
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
