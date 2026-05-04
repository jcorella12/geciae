"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  ETIQUETA_ESTADO_COTIZACION,
  type EstadoCotizacion,
} from "@/lib/cotizaciones/state";
import { cn } from "@/lib/utils";

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

type Cliente = {
  id: string;
  razon_social: string;
  rfc: string | null;
};

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const ESTADOS: EstadoCotizacion[] = [
  "borrador",
  "enviada",
  "aceptada",
  "rechazada",
  "vencida",
  "convertida",
];

export function CotizacionesToolbar({
  empresas,
  clientes,
  current,
  totalResultados,
}: {
  empresas: Empresa[];
  clientes: Cliente[];
  current: {
    q: string;
    estado: string;
    empresa: string;
    cliente: string;
    desde: string;
    hasta: string;
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
        router.replace(`/comercial/cotizaciones?${params.toString()}`),
      );
    }, 300);
    return () => clearTimeout(t);
  }, [q, current.q, router, searchParams]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() =>
      router.replace(`/comercial/cotizaciones?${params.toString()}`),
    );
  };

  const setQuickRange = (range: "este_mes" | "mes_pasado" | "ano" | "todo") => {
    const ahora = new Date();
    const params = new URLSearchParams(searchParams.toString());
    let desde: string | null = null;
    let hasta: string | null = null;
    if (range === "este_mes") {
      desde = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-01`;
      hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    } else if (range === "mes_pasado") {
      desde = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 10);
      hasta = new Date(ahora.getFullYear(), ahora.getMonth(), 0)
        .toISOString()
        .slice(0, 10);
    } else if (range === "ano") {
      desde = `${ahora.getFullYear()}-01-01`;
      hasta = ahora.toISOString().slice(0, 10);
    }
    if (desde) params.set("desde", desde);
    else params.delete("desde");
    if (hasta) params.set("hasta", hasta);
    else params.delete("hasta");
    startTransition(() =>
      router.replace(`/comercial/cotizaciones?${params.toString()}`),
    );
  };

  const hayFiltros =
    !!current.q ||
    !!current.estado ||
    !!current.empresa ||
    !!current.cliente ||
    !!current.desde ||
    !!current.hasta;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número, cliente, RFC…"
            className="h-10 border-0 bg-transparent pl-10 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        {totalResultados > 0 && (
          <span className="rounded-full bg-bg-2 px-3 py-1 font-mono text-[11px] tnum text-ink-2">
            {totalResultados.toLocaleString("es-MX")}{" "}
            {totalResultados === 1 ? "cotización" : "cotizaciones"}
          </span>
        )}
        {hayFiltros && (
          <button
            type="button"
            onClick={() => router.replace("/comercial/cotizaciones")}
            className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink-1"
          >
            <X className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* Periodo quick */}
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Periodo
        </span>
        <Quick label="Este mes" onClick={() => setQuickRange("este_mes")} />
        <Quick label="Mes pasado" onClick={() => setQuickRange("mes_pasado")} />
        <Quick label="Año" onClick={() => setQuickRange("ano")} />
        <Quick
          label="Todo"
          active={!current.desde && !current.hasta}
          onClick={() => setQuickRange("todo")}
        />
      </div>

      {/* Empresas */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="self-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 mr-1">
          Empresa
        </span>
        <button
          type="button"
          onClick={() => setParam("empresa", "")}
          className={cn(
            "rounded-md px-2 py-1 text-[11.5px] font-medium",
            !current.empresa
              ? "bg-brand text-brand-fg"
              : "bg-bg-2 text-ink-2 hover:bg-bg-3",
          )}
        >
          Todas
        </button>
        {empresas.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setParam("empresa", e.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium",
              current.empresa === e.id
                ? "bg-brand text-brand-fg"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3",
            )}
          >
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                empresaCodigoColor[e.codigo] ?? "bg-muted-foreground",
                current.empresa === e.id && "bg-white",
              )}
            />
            {e.codigo}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={current.estado}
          onChange={(e) => setParam("estado", e.target.value)}
          className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
        >
          <option value="">Cualquier estado</option>
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {ETIQUETA_ESTADO_COTIZACION[s]}
            </option>
          ))}
        </select>

        <select
          value={current.cliente}
          onChange={(e) => setParam("cliente", e.target.value)}
          className="h-8 max-w-[260px] rounded-md border border-input bg-card px-2 text-[12px]"
        >
          <option value="">Cualquier cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razon_social} ({c.rfc})
            </option>
          ))}
        </select>

        <span className="text-ink-5">·</span>

        <div className="inline-flex items-center gap-1 text-[11px]">
          <span className="text-ink-3">Desde</span>
          <input
            type="date"
            value={current.desde}
            onChange={(e) => setParam("desde", e.target.value)}
            className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
          />
          <span className="text-ink-3">hasta</span>
          <input
            type="date"
            value={current.hasta}
            onChange={(e) => setParam("hasta", e.target.value)}
            className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
          />
        </div>

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
            onClick={() => setParam("agrupar", "cliente")}
            className={cn(
              "rounded px-2 py-0.5 text-[11px] font-medium",
              current.agrupar === "cliente"
                ? "bg-brand text-brand-fg"
                : "text-ink-3 hover:text-ink-1",
            )}
          >
            Por cliente
          </button>
          <button
            type="button"
            onClick={() => setParam("agrupar", "estado")}
            className={cn(
              "rounded px-2 py-0.5 text-[11px] font-medium",
              current.agrupar === "estado"
                ? "bg-brand text-brand-fg"
                : "text-ink-3 hover:text-ink-1",
            )}
          >
            Por estado
          </button>
        </div>
      </div>
    </div>
  );
}

function Quick({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11.5px] font-medium",
        active
          ? "bg-brand text-brand-fg"
          : "bg-bg-2 text-ink-2 hover:bg-bg-3",
      )}
    >
      {label}
    </button>
  );
}
