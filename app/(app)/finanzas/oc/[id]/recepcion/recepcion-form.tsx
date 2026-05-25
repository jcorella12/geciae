"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { registrarRecepcion } from "./actions";
import { initialRecepcionState } from "./state";

export type ConceptoLinea = {
  id: string;
  orden: number;
  descripcion: string;
  cantidad: number;
  cantidad_recibida: number;
  unidad_sat: string | null;
  precio_unitario: number;
};

export function RecepcionForm({
  ocId,
  conceptos: initial,
  puedeEditar,
}: {
  ocId: string;
  conceptos: ConceptoLinea[];
  puedeEditar: boolean;
}) {
  const [state, formAction] = useFormState(
    registrarRecepcion.bind(null, ocId),
    initialRecepcionState,
  );

  // Edited values (controlled)
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const c of initial) {
      m[c.id] = String(c.cantidad_recibida ?? 0);
    }
    return m;
  });

  function setRecibida(id: string, v: string) {
    setValores((prev) => ({ ...prev, [id]: v }));
  }

  function llenarTodo() {
    const m: Record<string, string> = {};
    for (const c of initial) {
      m[c.id] = String(c.cantidad);
    }
    setValores(m);
  }

  function limpiar() {
    const m: Record<string, string> = {};
    for (const c of initial) {
      m[c.id] = "0";
    }
    setValores(m);
  }

  const conceptosJson = JSON.stringify(
    initial.map((c) => ({
      id: c.id,
      cantidad_recibida: Number(valores[c.id] ?? 0) || 0,
    })),
  );

  const totales = useMemo(() => {
    let pedido = 0;
    let recibido = 0;
    for (const c of initial) {
      pedido += c.cantidad;
      recibido += Number(valores[c.id] ?? 0) || 0;
    }
    return { pedido, recibido, pct: pedido > 0 ? (recibido / pedido) * 100 : 0 };
  }, [initial, valores]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="conceptos" value={conceptosJson} />

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/30 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Concepto</th>
              <th className="px-4 py-2 text-right font-medium">Pedido</th>
              <th className="px-4 py-2 font-medium">Unidad</th>
              <th className="px-4 py-2 text-right font-medium">Recibido</th>
              <th className="px-4 py-2 text-right font-medium">Restante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initial.map((c) => {
              const recibido = Number(valores[c.id] ?? 0) || 0;
              const restante = Math.max(0, c.cantidad - recibido);
              const completo = recibido >= c.cantidad;
              return (
                <tr key={c.id} className={completo ? "bg-success/5" : ""}>
                  <td className="px-4 py-2 text-muted-foreground">{c.orden}</td>
                  <td className="px-4 py-2">{c.descripcion}</td>
                  <td className="px-4 py-2 text-right font-mono">{c.cantidad}</td>
                  <td className="px-4 py-2 text-xs">{c.unidad_sat ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      min="0"
                      max={c.cantidad}
                      step="0.01"
                      value={valores[c.id] ?? "0"}
                      onChange={(e) => setRecibida(c.id, e.target.value)}
                      disabled={!puedeEditar}
                      className="ml-auto h-8 w-28 text-right font-mono"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {restante > 0 ? (
                      <span className="text-warning-foreground">{restante}</span>
                    ) : (
                      <span className="text-success">✓ completo</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-border bg-secondary/20">
            <tr>
              <td colSpan={2} className="px-4 py-2 text-sm font-medium">
                Avance global
              </td>
              <td className="px-4 py-2 text-right font-mono">{totales.pedido}</td>
              <td />
              <td className="px-4 py-2 text-right font-mono">
                {totales.recibido}
              </td>
              <td className="px-4 py-2 text-right text-xs">
                {totales.pct.toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {puedeEditar && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={llenarTodo}
          >
            Marcar todo recibido
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={limpiar}>
            Limpiar
          </Button>
          <SubmitBtn />
        </div>
      )}
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar recepción"}
    </Button>
  );
}
