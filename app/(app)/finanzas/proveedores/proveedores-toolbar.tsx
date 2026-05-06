"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SEMAFOROS = [
  { value: "verde", label: "Verde", color: "bg-emerald-500" },
  { value: "amarillo", label: "Amarillo", color: "bg-amber-500" },
  { value: "rojo", label: "Rojo", color: "bg-red-500" },
  { value: "negro", label: "Negro", color: "bg-gray-800" },
] as const;

const TIPOS = [
  "materiales",
  "servicios",
  "subcontratista",
  "transportista",
  "recurrente",
  "estrategico",
  "ocasional",
];

export function ProveedoresToolbar({
  current,
  totalResultados,
}: {
  current: {
    q: string;
    tipo: string;
    semaforo: string;
    activo: string;
    repse: string;
    aprobado: string;
    agrupar: string;
  };
  totalResultados: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(current.q);

  useEffect(() => setQ(current.q), [current.q]);

  useEffect(() => {
    if (q === current.q) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      startTransition(() =>
        router.replace(`/finanzas/proveedores?${params.toString()}`),
      );
    }, 300);
    return () => clearTimeout(t);
  }, [q, current.q, router, searchParams]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() =>
      router.replace(`/finanzas/proveedores?${params.toString()}`),
    );
  };

  const hayFiltros =
    !!current.q ||
    !!current.tipo ||
    !!current.semaforo ||
    !!current.activo ||
    !!current.repse ||
    !!current.aprobado;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por RFC, razón social, nombre comercial…"
            className="h-10 border-0 bg-transparent pl-10 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        {totalResultados > 0 && (
          <span className="rounded-full bg-bg-2 px-3 py-1 font-mono text-[11px] tnum text-ink-2">
            {totalResultados.toLocaleString("es-MX")}{" "}
            {totalResultados === 1 ? "proveedor" : "proveedores"}
          </span>
        )}
        {hayFiltros && (
          <button
            type="button"
            onClick={() => router.replace("/finanzas/proveedores")}
            className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink-1"
          >
            <X className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* Semáforo pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="self-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Semáforo
        </span>
        <button
          type="button"
          onClick={() => setParam("semaforo", "")}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
            !current.semaforo
              ? "bg-brand text-brand-fg"
              : "bg-bg-2 text-ink-2 hover:bg-bg-3",
          )}
        >
          Todos
        </button>
        {SEMAFOROS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setParam("semaforo", s.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
              current.semaforo === s.value
                ? "bg-brand text-brand-fg"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3",
            )}
          >
            <span className={cn("inline-block h-2 w-2 rounded-full", s.color)} />
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="self-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Filtros
        </span>

        <select
          value={current.tipo}
          onChange={(e) => setParam("tipo", e.target.value)}
          className="h-8 rounded-md border border-input bg-card px-2 text-[12px] capitalize"
        >
          <option value="">Cualquier tipo</option>
          {TIPOS.map((t) => (
            <option key={t} value={t} className="capitalize">
              {t}
            </option>
          ))}
        </select>

        <select
          value={current.repse}
          onChange={(e) => setParam("repse", e.target.value)}
          className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
        >
          <option value="">REPSE: cualquiera</option>
          <option value="true">Requiere REPSE</option>
          <option value="false">No requiere REPSE</option>
        </select>

        <select
          value={current.aprobado}
          onChange={(e) => setParam("aprobado", e.target.value)}
          className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
        >
          <option value="">Aprobado: cualquiera</option>
          <option value="true">Solo aprobados</option>
          <option value="false">Sin aprobar</option>
        </select>

        <span className="text-ink-5">·</span>

        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setParam("agrupar", "")}
            className={cn(
              "rounded px-2 py-0.5 text-[11px] font-medium",
              !current.agrupar
                ? "bg-brand text-brand-fg"
                : "text-ink-3 hover:text-ink-1",
            )}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setParam("agrupar", "tipo")}
            className={cn(
              "rounded px-2 py-0.5 text-[11px] font-medium",
              current.agrupar === "tipo"
                ? "bg-brand text-brand-fg"
                : "text-ink-3 hover:text-ink-1",
            )}
          >
            Por tipo
          </button>
          <button
            type="button"
            onClick={() => setParam("agrupar", "semaforo")}
            className={cn(
              "rounded px-2 py-0.5 text-[11px] font-medium",
              current.agrupar === "semaforo"
                ? "bg-brand text-brand-fg"
                : "text-ink-3 hover:text-ink-1",
            )}
          >
            Por semáforo
          </button>
        </div>

        <Link
          href={`/api/proveedores/export?${searchParams.toString()}`}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12px] hover:bg-bg-2"
        >
          📊 Exportar CSV
        </Link>
      </div>
    </div>
  );
}
