"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DualBar } from "@/components/ui/dual-bar";
import { Input } from "@/components/ui/input";
import { StatusDot, type StatusLevel } from "@/components/ui/status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import { ESTADOS_PROYECTO } from "@/lib/proyectos/state";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const fmtDateShort = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : "—";

function semaforoStatus(s: string | null): StatusLevel {
  if (s === "rojo") return "danger";
  if (s === "amarillo") return "warning";
  if (s === "verde") return "ok";
  return "idle";
}

function avanceFinanciero(p: {
  monto_contratado: number | null;
  monto_facturado: number | null;
}): number {
  const c = Number(p.monto_contratado ?? 0);
  const f = Number(p.monto_facturado ?? 0);
  if (c <= 0) return 0;
  return Math.round((f / c) * 100);
}

function avancePlan(p: {
  fecha_inicio_planeado: string | null;
  fecha_fin_planeado: string | null;
}): number {
  const ini = p.fecha_inicio_planeado;
  const fin = p.fecha_fin_planeado;
  if (!ini || !fin) return 0;
  const t0 = new Date(ini).getTime();
  const t1 = new Date(fin).getTime();
  const t = Date.now();
  if (t1 <= t0) return 0;
  if (t <= t0) return 0;
  if (t >= t1) return 100;
  return Math.round(((t - t0) / (t1 - t0)) * 100);
}

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

type Proyecto = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string | null;
  estado: string | null;
  fecha_inicio_planeado: string | null;
  fecha_fin_planeado: string | null;
  monto_contratado: number | null;
  monto_facturado: number | null;
  presupuesto_costo: number | null;
  costo_real: number | null;
  semaforo: string | null;
  empresa_id: string;
  empresas: { codigo: string; nombre_comercial: string | null } | null;
  clientes: {
    razon_social: string;
    nombre_comercial: string | null;
  } | null;
};

export function ProyectosTable({
  proyectos,
  empresas,
  currentQ,
  currentEstado,
  currentEmpresa,
}: {
  proyectos: Proyecto[];
  empresas: Empresa[];
  currentQ: string;
  currentEstado: string;
  currentEmpresa: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(currentQ);

  useEffect(() => setQ(currentQ), [currentQ]);

  useEffect(() => {
    if (q === currentQ) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      startTransition(() => router.replace(`/proyectos?${params.toString()}`));
    }, 300);
    return () => clearTimeout(t);
  }, [q, currentQ, router, searchParams]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.replace(`/proyectos?${params.toString()}`));
  };

  const haFiltros = currentQ || currentEstado || currentEmpresa;

  return (
    <div className="space-y-4">
      {/* Toolbar de filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3 shadow-xs">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código o nombre…"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
        <select
          value={currentEstado}
          onChange={(e) => setParam("estado", e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-[13px]"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_PROYECTO.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={currentEmpresa}
          onChange={(e) => setParam("empresa", e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-[13px]"
        >
          <option value="">Todas las empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.codigo} — {e.nombre_comercial ?? e.razon_social}
            </option>
          ))}
        </select>
        {haFiltros && (
          <button
            type="button"
            onClick={() => router.replace("/proyectos")}
            className="inline-flex items-center gap-1 text-[12px] text-ink-3 transition hover:text-ink-1"
          >
            <X className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </div>

      {proyectos.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm font-medium">Sin proyectos.</p>
          <p className="mt-1 text-xs text-ink-3">
            {haFiltros
              ? "Prueba quitar algún filtro."
              : "Crea el primer proyecto con el botón arriba."}
          </p>
        </div>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Proyecto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="w-[200px]">Avance vs plan</TableHead>
                <TableHead align="right">Contratado</TableHead>
                <TableHead align="right">Facturado</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyectos.map((p) => {
                const real = avanceFinanciero(p);
                const plan = avancePlan(p);
                const status = semaforoStatus(p.semaforo);
                const estado =
                  ESTADOS_PROYECTO.find((s) => s.value === p.estado) ??
                  ESTADOS_PROYECTO[0];
                const cliente =
                  p.clientes?.nombre_comercial ??
                  p.clientes?.razon_social ??
                  "—";
                return (
                  <TableRow
                    key={p.id}
                    href={`/proyectos/${p.id}`}
                    linkLabel={`Abrir proyecto ${p.codigo} ${p.nombre}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <StatusDot status={status} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {p.nombre}
                          </div>
                          <div className="font-mono text-[11px] text-ink-3">
                            {p.codigo}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-ink-3">{cliente}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DualBar
                          planned={plan}
                          actual={real}
                          max={100}
                          height={14}
                          className="flex-1"
                        />
                        <span
                          className={`min-w-[58px] text-right font-mono tnum text-[11.5px] ${
                            real < plan ? "text-danger-deep" : "text-ink-2"
                          }`}
                        >
                          {real}/{plan}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell align="right" mono>
                      {p.monto_contratado != null
                        ? fmtMxn.format(Number(p.monto_contratado))
                        : "—"}
                    </TableCell>
                    <TableCell align="right" mono>
                      {p.monto_facturado != null
                        ? fmtMxn.format(Number(p.monto_facturado))
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-[12px]">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            empresaCodigoColor[p.empresas?.codigo ?? ""] ??
                            "bg-muted-foreground"
                          }`}
                        />
                        {p.empresas?.codigo ?? "?"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${estado.color}`}
                      >
                        {estado.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-[12px] text-ink-3">
                      {fmtDateShort(p.fecha_fin_planeado)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </div>
  );
}
