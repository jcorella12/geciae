"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { CentroOpcion } from "@/lib/centros/listar";

import { asignarCentroBulk, type AsignarBulkResultado } from "./actions";

type Sin = {
  tipo: string;
  id: string;
  empresa_id: string;
  numero: string | null;
  monto: number | null;
  alias?: string;
};

const ETIQUETA: Record<string, string> = {
  oc: "OC",
  ot: "OT",
  cfdi: "CFDI",
  gasto_recurrente: "Gasto",
};

function fmt(n: number) {
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Toolbar bulk: cuando hay seleccionados, muestra selector de centro + botón
 * para asignar todos de una. Restringe centros a la empresa común.
 */
export function BulkAsignarForm({
  seleccion,
  centros,
}: {
  seleccion: Sin[];
  centros: CentroOpcion[];
}) {
  const [centroId, setCentroId] = useState<string>("");
  const [pending, start] = useTransition();
  const [resultado, setResultado] = useState<AsignarBulkResultado | null>(
    null,
  );

  if (seleccion.length === 0) return null;

  // Empresa común
  const empresasUnicas = Array.from(new Set(seleccion.map((s) => s.empresa_id)));
  const mismaEmpresa = empresasUnicas.length === 1 ? empresasUnicas[0] : null;

  const opciones = centros.filter(
    (c) => mismaEmpresa && c.empresa_id === mismaEmpresa,
  );

  const tieneOC = seleccion.some((s) => s.tipo !== "ot");
  const tieneOT = seleccion.some((s) => s.tipo === "ot");

  function ejecutar() {
    if (!centroId) return;
    const fd = new FormData();
    seleccion.forEach((s) => fd.append("ids", `${s.tipo}:${s.id}`));
    fd.set("centro_id", centroId);
    start(async () => {
      const r = await asignarCentroBulk(fd);
      setResultado(r);
    });
  }

  return (
    <div className="sticky top-0 z-10 rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">
          {seleccion.length} seleccionado{seleccion.length === 1 ? "" : "s"}
        </span>
        {!mismaEmpresa ? (
          <span className="text-xs text-amber-700">
            ⚠ Hay transacciones de empresas distintas. Filtra por empresa para
            asignar bulk.
          </span>
        ) : (
          <>
            <select
              value={centroId}
              onChange={(e) => setCentroId(e.target.value)}
              className="flex h-9 w-72 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">— elige centro —</option>
              {opciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {c.nombre} ({c.tipo})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={ejecutar}
              disabled={!centroId || pending}
            >
              {pending
                ? "Asignando…"
                : `Asignar a ${seleccion.length} transacc.`}
            </Button>
            {tieneOT && tieneOC && (
              <span className="text-xs text-muted-foreground">
                Tip: OT usa centro_origen si CC, centro_destino si CU.
              </span>
            )}
          </>
        )}
      </div>

      {resultado && (
        <div className="mt-3 text-xs">
          <p className="font-medium text-emerald-700">
            ✓ {resultado.asignados} asignadas
          </p>
          {resultado.errores.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-rose-700">
              {resultado.errores.slice(0, 5).map((e, i) => (
                <li key={i}>
                  {ETIQUETA[e.tipo] ?? e.tipo} {e.id.slice(0, 8)}: {e.error}
                </li>
              ))}
              {resultado.errores.length > 5 && (
                <li>… y {resultado.errores.length - 5} más</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Checkbox individual para seleccionar transacción. Comparte estado vía
 * prop callback (page no es client → seleccion vive en este wrapper).
 */
export function ListaConBulk({
  rows,
  centros,
}: {
  rows: Sin[];
  centros: CentroOpcion[];
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());

  const seleccion = rows.filter((r) => sel.has(`${r.tipo}:${r.id}`));

  function toggle(ref: string) {
    const next = new Set(sel);
    if (next.has(ref)) next.delete(ref);
    else next.add(ref);
    setSel(next);
  }

  function toggleAll() {
    if (sel.size === rows.length) setSel(new Set());
    else setSel(new Set(rows.map((r) => `${r.tipo}:${r.id}`)));
  }

  return (
    <div className="space-y-3">
      <BulkAsignarForm seleccion={seleccion} centros={centros} />

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr className="text-left">
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={sel.size === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Número</th>
              <th className="px-4 py-2 text-right font-medium">Monto</th>
              <th className="px-4 py-2 font-medium">Alias</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const ref = `${r.tipo}:${r.id}`;
              const checked = sel.has(ref);
              return (
                <tr
                  key={ref}
                  className={
                    checked ? "bg-primary/5" : "hover:bg-secondary/30"
                  }
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(ref)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {ETIQUETA[r.tipo] ?? r.tipo}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {r.numero ?? r.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                    {r.monto != null ? fmt(Number(r.monto)) : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {r.alias ?? "—"}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Sin transacciones pendientes. ✓
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
