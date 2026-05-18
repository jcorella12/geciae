"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/components/ui/notify";
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
  agrupar = false,
}: {
  cuentas: Cuenta[];
  empresasGestionables: string[];
  /** Si true, separa la lista en bloques por empresa con header. */
  agrupar?: boolean;
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
        notify({ message: res.error ?? "Error", variant: "error" });
        return;
      }
      setEditId(null);
    });
  }

  function toggleActiva(c: Cuenta) {
    startTransition(async () => {
      const res = await toggleCuentaActiva(c.id, !(c.activa ?? false));
      if (!res.ok) notify({ message: res.error ?? "Error", variant: "error" });
    });
  }

  if (cuentas.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
        Sin cuentas bancarias.
      </div>
    );
  }

  // Modo agrupado: separamos en bloques por empresa y renderizamos un Table
  // por bloque con su header.
  if (agrupar) {
    const grupos = new Map<string, { codigo: string; cuentas: Cuenta[] }>();
    for (const c of cuentas) {
      const codigo = c.empresas?.codigo ?? "?";
      if (!grupos.has(codigo)) {
        grupos.set(codigo, { codigo, cuentas: [] });
      }
      grupos.get(codigo)!.cuentas.push(c);
    }
    return (
      <div className="space-y-4">
        {Array.from(grupos.values()).map((g) => (
          <section key={g.codigo}>
            <header className="mb-2 flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  empresaCodigoColor[g.codigo] ?? "bg-muted-foreground"
                }`}
              />
              <h3 className="text-[13px] font-semibold tracking-wide">
                {g.codigo}
              </h3>
              <span className="text-[11.5px] text-ink-3">
                · {g.cuentas.length}{" "}
                {g.cuentas.length === 1 ? "cuenta" : "cuentas"}
              </span>
            </header>
            <CuentasTable
              cuentas={g.cuentas}
              empresasGestionables={empresasGestionables}
              editId={editId}
              editValor={editValor}
              setEditValor={setEditValor}
              setEditId={setEditId}
              iniciarEdicion={iniciarEdicion}
              guardarSaldo={guardarSaldo}
              toggleActiva={toggleActiva}
              showEmpresaColumn={false}
            />
          </section>
        ))}
      </div>
    );
  }

  return (
    <CuentasTable
      cuentas={cuentas}
      empresasGestionables={empresasGestionables}
      editId={editId}
      editValor={editValor}
      setEditValor={setEditValor}
      setEditId={setEditId}
      iniciarEdicion={iniciarEdicion}
      guardarSaldo={guardarSaldo}
      toggleActiva={toggleActiva}
      showEmpresaColumn={true}
    />
  );
}

/**
 * Tabla interna reutilizable. Se extrae para que la modalidad agrupada
 * pueda renderizar un sub-table por empresa sin duplicar la lógica de filas.
 */
function CuentasTable({
  cuentas,
  empresasGestionables,
  editId,
  editValor,
  setEditValor,
  setEditId,
  iniciarEdicion,
  guardarSaldo,
  toggleActiva,
  showEmpresaColumn,
}: {
  cuentas: Cuenta[];
  empresasGestionables: string[];
  editId: string | null;
  editValor: string;
  setEditValor: (v: string) => void;
  setEditId: (id: string | null) => void;
  iniciarEdicion: (c: Cuenta) => void;
  guardarSaldo: () => void;
  toggleActiva: (c: Cuenta) => void;
  showEmpresaColumn: boolean;
}) {
  return (
    <TableSurface>
      <Table>
        <TableHeader>
          <TableRow interactive={false}>
            {showEmpresaColumn && <TableHead>Empresa</TableHead>}
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
            // Si la fila está en modo edición, no usamos stretched link para
            // que el input/botones reciban clicks sin interferencia.
            const editing = editId === c.id;
            return (
              <TableRow
                key={c.id}
                href={editing ? undefined : `/finanzas/tesoreria/cuentas/${c.id}`}
                linkLabel={`Abrir cuenta ${c.banco} ${c.numero_cuenta}`}
                className={c.activa === false ? "opacity-60" : undefined}
              >
                {showEmpresaColumn && (
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
                )}
                <TableCell>
                  <p className="font-medium">{c.banco}</p>
                  {c.tipo && (
                    <p className="text-xs text-ink-3 capitalize">{c.tipo}</p>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <p>{c.numero_cuenta}</p>
                  {c.clabe && (
                    <p className="text-ink-3">CLABE: {c.clabe}</p>
                  )}
                </TableCell>
                <TableCell className="text-xs">{c.alias ?? "—"}</TableCell>
                <TableCell align="right">
                  {editing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editValor}
                      onChange={(e) => setEditValor(e.target.value)}
                      className="relative z-10 w-32 text-right font-mono"
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
                    (editing ? (
                      <div className="relative z-10 flex gap-1">
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
                      <div className="relative z-10 flex gap-1">
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
