"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
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
import { ESTADOS_OC } from "@/lib/oc/state";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

type OC = {
  id: string;
  numero: string;
  fecha_emision: string;
  total: number;
  estado: string | null;
  empresa_id: string;
  proveedor_id: string;
  empresas: { codigo: string; nombre_comercial: string | null } | null;
  proveedores: { razon_social: string; rfc: string; semaforo: string | null } | null;
};

export function OCTable({
  ocs,
  empresas,
  currentQ,
  currentEstado,
  currentEmpresa,
}: {
  ocs: OC[];
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
      startTransition(() =>
        router.replace(`/finanzas/oc?${params.toString()}`),
      );
    }, 300);
    return () => clearTimeout(t);
  }, [q, currentQ, router, searchParams]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() =>
      router.replace(`/finanzas/oc?${params.toString()}`),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3 shadow-xs">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número de OC…"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
        <select
          value={currentEstado}
          onChange={(e) => setParam("estado", e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-[13px]"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_OC.map((s) => (
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
        {(currentQ || currentEstado || currentEmpresa) && (
          <button
            type="button"
            onClick={() => router.replace("/finanzas/oc")}
            className="inline-flex items-center gap-1 text-[12px] text-ink-3 transition hover:text-ink-1"
          >
            <X className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </div>

      {ocs.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm font-medium">Sin órdenes de compra.</p>
          <p className="mt-1 text-xs text-ink-3">
            Crea la primera con el botón arriba.
          </p>
        </div>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>OC</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead align="right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ocs.map((oc) => {
                const estado =
                  ESTADOS_OC.find((s) => s.value === oc.estado) ??
                  ESTADOS_OC[0];
                return (
                  <TableRow key={oc.id}>
                    <TableCell className="font-mono">
                      <Link
                        href={`/finanzas/oc/${oc.id}`}
                        className="font-medium hover:text-brand hover:underline"
                      >
                        {oc.numero}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            empresaCodigoColor[oc.empresas?.codigo ?? ""] ??
                            "bg-muted-foreground"
                          }`}
                        />
                        {oc.empresas?.codigo ?? "?"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {oc.proveedores?.razon_social ?? "?"}
                      <p className="font-mono text-ink-3">
                        {oc.proveedores?.rfc ?? ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-ink-3">
                      {new Date(oc.fecha_emision).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell align="right" mono>
                      {fmtMxn.format(Number(oc.total))}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${estado.color}`}
                      >
                        {estado.label}
                      </span>
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
