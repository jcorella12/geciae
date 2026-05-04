"use client";

import { Search } from "lucide-react";
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
import { TIPOS_CLIENTE } from "@/lib/clientes/schemas";

type Cliente = {
  id: string;
  razon_social: string;
  nombre_comercial: string | null;
  rfc: string | null;
  tipo: string | null;
  riesgo: string | null;
  activo: boolean | null;
  created_at: string | null;
};

const riesgoBadge: Record<string, string> = {
  bajo: "bg-success/15 text-success",
  medio: "bg-warning/15 text-foreground",
  alto: "bg-destructive/15 text-destructive",
};

export function ClientesTable({
  clientes,
  currentQ,
  currentTipo,
  currentActivo,
}: {
  clientes: Cliente[];
  currentQ: string;
  currentTipo: string;
  currentActivo: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(currentQ);

  useEffect(() => {
    setQ(currentQ);
  }, [currentQ]);

  // Debounce de búsqueda — 300ms.
  useEffect(() => {
    if (q === currentQ) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      startTransition(() => {
        router.replace(`/clientes?${params.toString()}`);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q, currentQ, router, searchParams]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.replace(`/clientes?${params.toString()}`);
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
            placeholder="Buscar por razón social, nombre comercial o RFC…"
            className="pl-9"
          />
        </div>

        <select
          value={currentTipo}
          onChange={(e) => setParam("tipo", e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_CLIENTE.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={currentActivo}
          onChange={(e) => setParam("activo", e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Activos e inactivos</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
        </select>

        {(currentQ || currentTipo || currentActivo) && (
          <button
            type="button"
            onClick={() => router.replace("/clientes")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Limpiar
          </button>
        )}
      </div>

      {clientes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm font-medium">Sin resultados.</p>
          <p className="mt-1 text-xs text-ink-3">
            {currentQ || currentTipo || currentActivo
              ? "Prueba quitando los filtros."
              : "Crea el primer cliente con el botón arriba."}
          </p>
        </div>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Razón social</TableHead>
                <TableHead>RFC</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow
                  key={c.id}
                  className={c.activo === false ? "opacity-60" : undefined}
                >
                  <TableCell>
                    <Link
                      href={`/clientes/${c.id}`}
                      className="font-medium hover:text-brand hover:underline"
                    >
                      {c.razon_social}
                    </Link>
                    {c.nombre_comercial && (
                      <p className="text-xs text-ink-3">
                        {c.nombre_comercial}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.rfc}</TableCell>
                  <TableCell className="text-xs capitalize">
                    {c.tipo ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                        riesgoBadge[c.riesgo ?? "bajo"] ?? "bg-secondary"
                      }`}
                    >
                      {c.riesgo ?? "bajo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.activo === false ? (
                      <span className="text-ink-3">Inactivo</span>
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
