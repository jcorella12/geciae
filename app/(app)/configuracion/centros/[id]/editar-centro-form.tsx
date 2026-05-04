"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  initialSimpleCentroState,
  type SimpleCentroState,
} from "@/lib/centros/state";

import { actualizarCentro } from "../actions";

type Centro = {
  id: string;
  nombre: string;
  descripcion: string | null;
  presupuesto_anual: number | null;
  observaciones: string | null;
};

const initial: SimpleCentroState = initialSimpleCentroState;

export function EditarCentroForm({
  centro,
  puedeEditar,
}: {
  centro: Centro;
  puedeEditar: boolean;
}) {
  const [state, formAction] = useFormState(actualizarCentro, initial);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <input type="hidden" name="centro_id" value={centro.id} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Editar centro</h3>
        {!puedeEditar && (
          <span className="text-xs text-muted-foreground">
            Solo lectura (sin permisos)
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            type="text"
            defaultValue={centro.nombre}
            disabled={!puedeEditar}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="presupuesto_anual">Presupuesto anual</Label>
          <Input
            id="presupuesto_anual"
            name="presupuesto_anual"
            type="number"
            min="0"
            step="0.01"
            defaultValue={centro.presupuesto_anual?.toString() ?? ""}
            disabled={!puedeEditar}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={2}
          maxLength={2000}
          defaultValue={centro.descripcion ?? ""}
          disabled={!puedeEditar}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={2}
          maxLength={2000}
          defaultValue={centro.observaciones ?? ""}
          disabled={!puedeEditar}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          Cambios guardados.
        </p>
      )}

      {puedeEditar && <SaveButton />}
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}
