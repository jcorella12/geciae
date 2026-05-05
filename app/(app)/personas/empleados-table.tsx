"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import { CATEGORIAS_PERSONAL } from "@/lib/empleados/schemas";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const categoriaBadge: Record<string, string> = {
  planta: "bg-success/15 text-success",
  por_obra: "bg-warning/15 text-foreground",
  repse: "bg-info/15 text-info",
};

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

type Empleado = {
  id: string;
  nombre_completo: string;
  curp: string;
  numero_empleado: string;
  categoria: string;
  puesto: string;
  area: string | null;
  fecha_ingreso: string;
  activo: boolean | null;
  empresa_id: string;
  empresas: { codigo: string; nombre_comercial: string | null; razon_social: string } | null;
};

export function EmpleadosTable({
  empleados,
  empresas,
  puestos = [],
  currentQ,
  currentCategoria,
  currentEmpresa,
  currentActivo,
  currentPuesto = "",
  currentOrden = "nombre",
}: {
  empleados: Empleado[];
  empresas: Empresa[];
  puestos?: string[];
  currentQ: string;
  currentCategoria: string;
  currentEmpresa: string;
  currentActivo: string;
  currentPuesto?: string;
  currentOrden?: string;
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
      startTransition(() => {
        router.replace(`/personas?${params.toString()}`);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q, currentQ, router, searchParams]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.replace(`/personas?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3 shadow-xs">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, CURP, número o puesto…"
            className="pl-9"
          />
        </div>
        <select
          value={currentCategoria}
          onChange={(e) => setParam("categoria", e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS_PERSONAL.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={currentEmpresa}
          onChange={(e) => setParam("empresa", e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas las empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.codigo} — {e.nombre_comercial ?? e.razon_social}
            </option>
          ))}
        </select>
        <select
          value={currentActivo}
          onChange={(e) => setParam("activo", e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Activos y bajas</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo bajas</option>
        </select>
        {puestos.length > 0 && (
          <select
            value={currentPuesto}
            onChange={(e) => setParam("puesto", e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            title="Filtrar por puesto exacto"
          >
            <option value="">Todos los puestos</option>
            {puestos.map((p) => (
              <option key={p} value={p}>
                {p.length > 30 ? p.slice(0, 30) + "…" : p}
              </option>
            ))}
          </select>
        )}
        <select
          value={currentOrden}
          onChange={(e) => setParam("orden", e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          title="Ordenar por…"
        >
          <option value="nombre">Ordenar: Nombre</option>
          <option value="categoria">Ordenar: Categoría</option>
          <option value="puesto">Ordenar: Puesto</option>
          <option value="estado">Ordenar: Estado</option>
          <option value="fecha_ingreso">Ordenar: Fecha ingreso</option>
        </select>
        {(currentQ ||
          currentCategoria ||
          currentEmpresa ||
          currentActivo ||
          currentPuesto ||
          (currentOrden && currentOrden !== "nombre")) && (
          <button
            type="button"
            onClick={() => router.replace("/personas")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Limpiar
          </button>
        )}
      </div>

      {empleados.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm font-medium">Sin resultados.</p>
          <p className="mt-1 text-xs text-ink-3">
            {currentQ || currentCategoria || currentEmpresa || currentActivo
              ? "Prueba quitando los filtros."
              : "Crea el primer empleado con el botón arriba."}
          </p>
        </div>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Nombre</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead># Empleado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empleados.map((e) => (
                <TableRow
                  key={e.id}
                  href={`/personas/${e.id}`}
                  linkLabel={`Abrir empleado ${e.nombre_completo}`}
                  className={e.activo === false ? "opacity-60" : undefined}
                >
                  <TableCell>
                    <p className="font-medium">{e.nombre_completo}</p>
                    <p className="font-mono text-xs text-ink-3">
                      {e.curp}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-xs">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          empresaCodigoColor[e.empresas?.codigo ?? ""] ??
                          "bg-muted-foreground"
                        }`}
                      />
                      {e.empresas?.codigo ?? "?"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        categoriaBadge[e.categoria] ?? "bg-secondary"
                      }`}
                    >
                      {CATEGORIAS_PERSONAL.find((c) => c.value === e.categoria)
                        ?.label ?? e.categoria}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {e.puesto}
                    {e.area && (
                      <span className="block text-ink-3">{e.area}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {e.numero_empleado}
                  </TableCell>
                  <TableCell className="text-xs">
                    {e.activo === false ? (
                      <span className="text-ink-3">Baja</span>
                    ) : (
                      <span className="text-success">Activo</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </div>
  );
}
