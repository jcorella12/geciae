"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
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

import { actualizarSaldo, toggleCuentaActiva } from "./actions";

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

type Cuenta = {
  id: string;
  empresa_id: string;
  banco: string;
  numero_cuenta: string;
  clabe: string | null;
  alias: string | null;
  tipo: string | null;
  saldo_actual: number | null;
  fecha_actualizacion_saldo: string | null;
  activa: boolean | null;
  empresas: { codigo: string } | null;
};

export function CuentasList({
  cuentas,
  empresasGestionables,
}: {
  cuentas: Cuenta[];
  empresasGestionables: string[];
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState("");
  const [, startTransition] = useTransition();

  function iniciarEdicion(c: Cuenta) {
    setEditId(c.id);
    setEditValor(String(c.saldo_actual ?? 0));
  }

  function guardarSaldo() {
    if (!editId) return;
    const v = Number(editValor);
    if (Number.isNaN(v)) return;
    startTransition(async () => {
      const res = await actualizarSaldo(editId, v);
      if (!res.ok) {
        alert(`Error: ${res.error}`);
        return;
      }
      setEditId(null);
    });
  }

  function toggleActiva(c: Cuenta) {
    startTransition(async () => {
      const res = await toggleCuentaActiva(c.id, !(c.activa ?? false));
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  }

  if (cuentas.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
        Sin cuentas bancarias.
      </div>
    );
  }

  return (
    <TableSurface>
      <Table>
        <TableHeader>
          <TableRow interactive={false}>
            <TableHead>Empresa</TableHead>
            <TableHead>Banco / Tipo</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead>Alias</TableHead>
            <TableHead align="right">Saldo</TableHead>
            <TableHead>Actualizado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cuentas.map((c) => {
            const puede = empresasGestionables.includes(c.empresa_id);
            return (
              <TableRow
                key={c.id}
                className={c.activa === false ? "opacity-60" : undefined}
              >
                <TableCell className="text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        empresaCodigoColor[c.empresas?.codigo ?? ""] ??
                        "bg-muted-foreground"
                      }`}
                    />
                    {c.empresas?.codigo ?? "?"}
                  </span>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/finanzas/tesoreria/cuentas/${c.id}`}
                    className="font-medium hover:text-brand"
                  >
                    {c.banco}
                  </Link>
                  {c.tipo && (
                    <p className="text-xs text-ink-3 capitalize">{c.tipo}</p>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/finanzas/tesoreria/cuentas/${c.id}`}
                    className="hover:text-brand"
                  >
                    {c.numero_cuenta}
                  </Link>
                  {c.clabe && (
                    <p className="text-ink-3">CLABE: {c.clabe}</p>
                  )}
                </TableCell>
                <TableCell className="text-xs">{c.alias ?? "—"}</TableCell>
                <TableCell align="right">
                  {editId === c.id ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editValor}
                      onChange={(e) => setEditValor(e.target.value)}
                      className="w-32 text-right font-mono"
                      autoFocus
                    />
                  ) : c.tipo === "credito" ? (
                    <span
                      className="font-mono tnum text-red-700"
                      title="Pasivo: monto que se debe al banco"
                    >
                      − {fmtMxn.format(Number(c.saldo_actual ?? 0))}
                    </span>
                  ) : c.tipo === "inversion" ? (
                    <span
                      className="font-mono tnum text-emerald-700"
                      title="Activo: valor en valores"
                    >
                      {fmtMxn.format(Number(c.saldo_actual ?? 0))}
                    </span>
                  ) : (
                    <span className="font-mono tnum">
                      {fmtMxn.format(Number(c.saldo_actual ?? 0))}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-ink-3">
                  {c.fecha_actualizacion_saldo
                    ? new Date(c.fecha_actualizacion_saldo).toLocaleString(
                        "es-MX",
                        { dateStyle: "short", timeStyle: "short" },
                      )
                    : "—"}
                </TableCell>
                <TableCell>
                  {puede &&
                    (editId === c.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={guardarSaldo}>
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditId(null)}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => iniciarEdicion(c)}
                        >
                          Saldo
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActiva(c)}
                        >
                          {c.activa === false ? "Activar" : "Desactivar"}
                        </Button>
                      </div>
                    ))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableSurface>
  );
}
