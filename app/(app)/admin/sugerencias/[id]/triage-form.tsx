"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ESTADOS,
  ETIQUETA_ESTADO,
  initialUpdateSugerenciaState,
  type EstadoSugerencia,
} from "@/lib/sugerencias/state";

import { actualizarSugerencia } from "../actions";

/**
 * Form de triage de una sugerencia (CEO only).
 * Permite cambiar estado, prioridad, notas internas y asignar.
 */
export function SugerenciaTriageForm({
  sugerenciaId,
  estadoActual,
  prioridadActual,
  notasActuales,
  asignadoActual,
  candidatos,
}: {
  sugerenciaId: string;
  estadoActual: EstadoSugerencia;
  prioridadActual: number;
  notasActuales: string;
  asignadoActual: string | null;
  candidatos: Array<{ user_id: string; nombre: string; puesto: string | null }>;
}) {
  const [state, formAction] = useFormState(
    actualizarSugerencia,
    initialUpdateSugerenciaState,
  );
  const [showOk, setShowOk] = useState(false);
  useEffect(() => {
    if (state.ok) {
      setShowOk(true);
      const t = setTimeout(() => setShowOk(false), 2000);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-[13.5px] font-semibold">Triage</h2>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={sugerenciaId} />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="t_estado" className="text-[11.5px]">
              Estado
            </Label>
            <select
              id="t_estado"
              name="estado"
              defaultValue={estadoActual}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO[e]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="t_prioridad" className="text-[11.5px]">
              Prioridad (0-100)
            </Label>
            <Input
              id="t_prioridad"
              name="prioridad"
              type="number"
              min="0"
              max="100"
              defaultValue={prioridadActual}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="t_asignado" className="text-[11.5px]">
              Asignar a
            </Label>
            <select
              id="t_asignado"
              name="asignado_a"
              defaultValue={asignadoActual ?? ""}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">— Sin asignar —</option>
              {candidatos.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.nombre}
                  {c.puesto ? ` · ${c.puesto}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="t_notas" className="text-[11.5px]">
            Notas internas
          </Label>
          <textarea
            id="t_notas"
            name="notas_internas"
            rows={3}
            defaultValue={notasActuales}
            maxLength={4000}
            placeholder="Decisión, plan, link a issue, etc."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {state.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
            {state.error}
          </p>
        )}
        {showOk && (
          <p className="rounded-md border border-emerald-300/40 bg-emerald-50 px-2 py-1.5 text-[11.5px] text-emerald-900">
            Cambios guardados.
          </p>
        )}

        <Submit />
      </form>
    </section>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}
