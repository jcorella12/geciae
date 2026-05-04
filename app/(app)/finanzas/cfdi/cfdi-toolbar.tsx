"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

export function CfdiToolbar({
  empresas,
  current,
  totalResultados,
}: {
  empresas: Empresa[];
  current: {
    q: string;
    direccion: string;
    estado: string;
    empresa: string;
    desde: string;
    hasta: string;
    formaPago: string;
    montoMin: string;
    agrupar: string;
  };
  totalResultados: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(current.q);

  useEffect(() => setQ(current.q), [current.q]);

  // Debounce búsqueda
  useEffect(() => {
    if (q === current.q) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      startTransition(() => router.replace(`/finanzas/cfdi?${params.toString()}`));
    }, 300);
    return () => clearTimeout(t);
  }, [q, current.q, router, searchParams]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.replace(`/finanzas/cfdi?${params.toString()}`));
  };

  const setQuickRange = (
    range: "este_mes" | "mes_pasado" | "trimestre" | "ano" | "ano_pasado" | "todo",
  ) => {
    const ahora = new Date();
    const params = new URLSearchParams(searchParams.toString());
    let desde: string | null = null;
    let hasta: string | null = null;
    switch (range) {
      case "este_mes": {
        desde = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-01`;
        const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
        hasta = fin.toISOString().slice(0, 10);
        break;
      }
      case "mes_pasado": {
        const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
        const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
        desde = inicio.toISOString().slice(0, 10);
        hasta = fin.toISOString().slice(0, 10);
        break;
      }
      case "trimestre": {
        const trimMes = Math.floor(ahora.getMonth() / 3) * 3;
        const inicio = new Date(ahora.getFullYear(), trimMes, 1);
        desde = inicio.toISOString().slice(0, 10);
        hasta = ahora.toISOString().slice(0, 10);
        break;
      }
      case "ano": {
        desde = `${ahora.getFullYear()}-01-01`;
        hasta = ahora.toISOString().slice(0, 10);
        break;
      }
      case "ano_pasado": {
        desde = `${ahora.getFullYear() - 1}-01-01`;
        hasta = `${ahora.getFullYear() - 1}-12-31`;
        break;
      }
      case "todo": {
        desde = null;
        hasta = null;
        break;
      }
    }
    if (desde) params.set("desde", desde);
    else params.delete("desde");
    if (hasta) params.set("hasta", hasta);
    else params.delete("hasta");
    startTransition(() => router.replace(`/finanzas/cfdi?${params.toString()}`));
  };

  const hayFiltros =
    !!current.q ||
    !!current.direccion ||
    !!current.estado ||
    !!current.empresa ||
    !!current.desde ||
    !!current.hasta ||
    !!current.formaPago ||
    !!current.montoMin;

  // Detectar si el rango actual matchea un quick range
  const ahoraQR = new Date();
  const inicioMes = `${ahoraQR.getFullYear()}-${String(ahoraQR.getMonth() + 1).padStart(2, "0")}-01`;
  const inicioMesPasado = (() => {
    const d = new Date(ahoraQR.getFullYear(), ahoraQR.getMonth() - 1, 1);
    return d.toISOString().slice(0, 10);
  })();
  const finMesPasado = (() => {
    const d = new Date(ahoraQR.getFullYear(), ahoraQR.getMonth(), 0);
    return d.toISOString().slice(0, 10);
  })();
  const inicioAno = `${ahoraQR.getFullYear()}-01-01`;
  const isEsteMes =
    current.desde === inicioMes && !current.hasta;
  const isMesPasado =
    current.desde === inicioMesPasado && current.hasta === finMesPasado;
  const isAno = current.desde === inicioAno && !current.hasta;

  return (
    <div className="space-y-3">
      {/* Search bar grande */}
      <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por RFC, razón social, folio, UUID, concepto…"
            className="h-10 border-0 bg-transparent pl-10 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        {totalResultados > 0 && (
          <span className="rounded-full bg-bg-2 px-3 py-1 font-mono text-[11px] tnum text-ink-2">
            {totalResultados.toLocaleString("es-MX")}{" "}
            {totalResultados === 1 ? "resultado" : "resultados"}
          </span>
        )}
        {hayFiltros && (
          <button
            type="button"
            onClick={() => router.replace("/finanzas/cfdi")}
            className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink-1"
          >
            <X className="h-3 w-3" />
            Limpiar todo
          </button>
        )}
      </div>

      {/* Quick filter buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Periodo
        </span>
        <Quick
          label="Este mes"
          active={isEsteMes}
          onClick={() => setQuickRange("este_mes")}
        />
        <Quick
          label="Mes pasado"
          active={isMesPasado}
          onClick={() => setQuickRange("mes_pasado")}
        />
        <Quick
          label="Trimestre"
          active={false}
          onClick={() => setQuickRange("trimestre")}
        />
        <Quick
          label={`Año ${ahoraQR.getFullYear()}`}
          active={isAno}
          onClick={() => setQuickRange("ano")}
        />
        <Quick
          label={`${ahoraQR.getFullYear() - 1}`}
          active={false}
          onClick={() => setQuickRange("ano_pasado")}
        />
        <Quick
          label="Todo"
          active={!current.desde && !current.hasta}
          onClick={() => setQuickRange("todo")}
        />
      </div>

      {/* Filtros detallados */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Empresas: pills con dot de color */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="self-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 mr-1">
            Empresa
          </span>
          <button
            type="button"
            onClick={() => setParam("empresa", "")}
            className={cn(
              "rounded-md px-2 py-1 text-[11.5px] font-medium transition",
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
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium transition",
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

        <span className="text-ink-5">·</span>

        {/* Dirección */}
        <select
          value={current.direccion}
          onChange={(e) => setParam("direccion", e.target.value)}
          className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
        >
          <option value="">📤📥 Emitidos + recibidos</option>
          <option value="emitidos">📤 Solo emitidos (ventas)</option>
          <option value="recibidos">📥 Solo recibidos (gastos)</option>
        </select>

        {/* Estado */}
        <select
          value={current.estado}
          onChange={(e) => setParam("estado", e.target.value)}
          className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
        >
          <option value="">Todos los estados</option>
          <option value="timbrado">Timbrados</option>
          <option value="pagado">Pagados</option>
          <option value="cancelado">Cancelados</option>
        </select>

        {/* Forma pago */}
        <select
          value={current.formaPago}
          onChange={(e) => setParam("formaPago", e.target.value)}
          className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
        >
          <option value="">Cualquier método</option>
          <option value="PUE">PUE (una exhibición)</option>
          <option value="PPD">PPD (parcialidades)</option>
        </select>

        <span className="text-ink-5">·</span>

        {/* Rango fecha custom */}
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

        {/* Monto mínimo */}
        <div className="inline-flex items-center gap-1 text-[11px]">
          <span className="text-ink-3">Monto ≥</span>
          <Input
            type="number"
            placeholder="0"
            min="0"
            step="100"
            value={current.montoMin}
            onChange={(e) => setParam("montoMin", e.target.value)}
            className="h-8 w-24 text-[12px]"
          />
        </div>

        <span className="text-ink-5">·</span>

        {/* Vista (lista vs agrupada) */}
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
            onClick={() => setParam("agrupar", "contraparte")}
            className={cn(
              "rounded px-2 py-0.5 text-[11px] font-medium",
              current.agrupar === "contraparte"
                ? "bg-brand text-brand-fg"
                : "text-ink-3 hover:text-ink-1",
            )}
          >
            Por contraparte
          </button>
          <button
            type="button"
            onClick={() => setParam("agrupar", "mes")}
            className={cn(
              "rounded px-2 py-0.5 text-[11px] font-medium",
              current.agrupar === "mes"
                ? "bg-brand text-brand-fg"
                : "text-ink-3 hover:text-ink-1",
            )}
          >
            Por mes
          </button>
        </div>

        {/* Export */}
        <Link
          href={`/api/cfdi/export?${searchParams.toString()}`}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12px] hover:bg-bg-2"
        >
          📊 Exportar CSV
        </Link>
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
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
        active
          ? "bg-brand text-brand-fg"
          : "bg-bg-2 text-ink-2 hover:bg-bg-3",
      )}
    >
      {label}
    </button>
  );
}

