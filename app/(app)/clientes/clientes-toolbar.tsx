"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TIPOS = [
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "industrial", label: "Industrial" },
  { value: "gubernamental", label: "Gubernamental" },
] as const;

const SCORE_PILLS = [
  { value: "0", label: "Todos" },
  { value: "50", label: "≥ 50%" },
  { value: "80", label: "≥ 80%" },
] as const;

export function ClientesToolbar({
  current,
  totalResultados,
}: {
  current: {
    q: string;
    tipo: string;
    riesgo: string;
    activo: string;
    score_min: string;
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
        router.replace(`/clientes?${params.toString()}`),
      );
    }, 300);
    return () => clearTimeout(t);
  }, [q, current.q, router, searchParams]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() =>
      router.replace(`/clientes?${params.toString()}`),
    );
  };

  const hayFiltros =
    !!current.q ||
    !!current.tipo ||
    !!current.riesgo ||
    !!current.activo ||
    !!current.score_min;

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
            {totalResultados === 1 ? "cliente" : "clientes"}
          </span>
        )}
        {hayFiltros && (
          <button
            type="button"
            onClick={() => router.replace("/clientes")}
            className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink-1"
          >
            <X className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* Tipo pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="self-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Tipo
        </span>
        <button
          type="button"
          onClick={() => setParam("tipo", "")}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
            !current.tipo
              ? "bg-brand text-brand-fg"
              : "bg-bg-2 text-ink-2 hover:bg-bg-3",
          )}
        >
          Todos
        </button>
        {TIPOS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setParam("tipo", t.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
              current.tipo === t.value
                ? "bg-brand text-brand-fg"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Score pago pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="self-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Score pago
        </span>
        {SCORE_PILLS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() =>
              setParam("score_min", s.value === "0" ? "" : s.value)
            }
            className={cn(
              "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
              (current.score_min || "0") === s.value
                ? "bg-brand text-brand-fg"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="self-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Filtros
        </span>

        <select
          value={current.activo}
          onChange={(e) => setParam("activo", e.target.value)}
          className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
        >
          <option value="">Activos + inactivos</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
        </select>

        <select
          value={current.riesgo}
          onChange={(e) => setParam("riesgo", e.target.value)}
          className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
        >
          <option value="">Riesgo: cualquiera</option>
          <option value="bajo">Bajo</option>
          <option value="medio">Medio</option>
          <option value="alto">Alto</option>
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
            onClick={() => setParam("agrupar", "riesgo")}
            className={cn(
              "rounded px-2 py-0.5 text-[11px] font-medium",
              current.agrupar === "riesgo"
                ? "bg-brand text-brand-fg"
                : "text-ink-3 hover:text-ink-1",
            )}
          >
            Por riesgo
          </button>
        </div>

        <Link
          href={`/api/clientes/export?${searchParams.toString()}`}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12px] hover:bg-bg-2"
        >
          📊 Exportar CSV
        </Link>
      </div>
    </div>
  );
}
