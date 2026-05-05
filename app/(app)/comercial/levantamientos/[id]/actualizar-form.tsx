"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialSimpleLevState } from "@/lib/levantamientos/state";

import { actualizarLevantamiento } from "../actions";

type Lev = {
  id: string;
  fecha_propuesta: string | null;
  fecha_realizada: string | null;
  ingeniero_id: string | null;
  horas_ingeniero: number | null;
  viaticos: number | null;
  kilometraje: number | null;
  resultado_descripcion: string | null;
  url_informe: string | null;
  observaciones: string | null;
};

export function ActualizarLevantamientoForm({
  lev,
  ingenieros,
  puedeEditar,
}: {
  lev: Lev;
  ingenieros: Array<{ id: string; email: string }>;
  puedeEditar: boolean;
}) {
  const [state, formAction] = useFormState(
    actualizarLevantamiento,
    initialSimpleLevState,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <input type="hidden" name="levantamiento_id" value={lev.id} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Datos del levantamiento</h3>
        {!puedeEditar && (
          <span className="text-xs text-muted-foreground">
            Solo lectura
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fecha_propuesta">Fecha propuesta</Label>
          <Input
            id="fecha_propuesta"
            name="fecha_propuesta"
            type="date"
            defaultValue={lev.fecha_propuesta ?? ""}
            disabled={!puedeEditar}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha_realizada">Fecha realizada</Label>
          <Input
            id="fecha_realizada"
            name="fecha_realizada"
            type="date"
            defaultValue={lev.fecha_realizada ?? ""}
            disabled={!puedeEditar}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="ingeniero_id">Ingeniero asignado</Label>
        <select
          id="ingeniero_id"
          name="ingeniero_id"
          defaultValue={lev.ingeniero_id ?? ""}
          disabled={!puedeEditar}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
        >
          <option value="">— por asignar —</option>
          {ingenieros.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="horas_ingeniero">Horas ingeniero</Label>
          <Input
            id="horas_ingeniero"
            name="horas_ingeniero"
            type="number"
            min="0"
            step="0.25"
            defaultValue={lev.horas_ingeniero?.toString() ?? ""}
            disabled={!puedeEditar}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="viaticos">Viáticos (MXN)</Label>
          <Input
            id="viaticos"
            name="viaticos"
            type="number"
            min="0"
            step="0.01"
            defaultValue={lev.viaticos?.toString() ?? ""}
            disabled={!puedeEditar}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="kilometraje">Kilometraje (km)</Label>
          <Input
            id="kilometraje"
            name="kilometraje"
            type="number"
            min="0"
            step="0.1"
            defaultValue={lev.kilometraje?.toString() ?? ""}
            disabled={!puedeEditar}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="url_informe">URL informe (opcional)</Label>
        <Input
          id="url_informe"
          name="url_informe"
          type="url"
          defaultValue={lev.url_informe ?? ""}
          placeholder="https://drive.google.com/..."
          disabled={!puedeEditar}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="resultado_descripcion">Resultado / hallazgos</Label>
        <textarea
          id="resultado_descripcion"
          name="resultado_descripcion"
          rows={3}
          maxLength={2000}
          defaultValue={lev.resultado_descripcion ?? ""}
          disabled={!puedeEditar}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="observaciones">Observaciones</Label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={2}
          maxLength={2000}
          defaultValue={lev.observaciones ?? ""}
          disabled={!puedeEditar}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
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

      {puedeEditar && <SaveBtn />}
    </form>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}
