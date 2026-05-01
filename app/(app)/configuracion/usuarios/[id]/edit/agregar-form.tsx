"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { agregarVinculo, type ActualizarState } from "./actions";

const initialState: ActualizarState = {
  ok: false,
  error: null,
  message: null,
};

const ROLES = [
  { value: "operativo", label: "Operativo" },
  { value: "director", label: "Director" },
  { value: "ceo", label: "CEO" },
  { value: "empleado", label: "Empleado" },
  { value: "cliente", label: "Cliente" },
] as const;

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

export function AgregarVinculoForm({
  usuarioId,
  empresasDisponibles,
}: {
  usuarioId: string;
  empresasDisponibles: Empresa[];
}) {
  const [state, formAction] = useFormState(agregarVinculo, initialState);

  if (empresasDisponibles.length === 0) {
    return (
      <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        Este usuario ya tiene vínculos en las 4 empresas del grupo.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-lg border border-dashed border-border bg-card/60 p-4"
      key={state.ok ? "reset" : "form"}
    >
      <h3 className="mb-3 text-sm font-semibold">
        Vincular a otra empresa
      </h3>

      <input type="hidden" name="usuarioId" value={usuarioId} />

      <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
        <div className="space-y-1">
          <Label htmlFor="agregar-empresaId">Empresa</Label>
          <select
            id="agregar-empresaId"
            name="empresaId"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {empresasDisponibles.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} · {e.nombre_comercial ?? e.razon_social}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="agregar-rol">Rol</Label>
          <select
            id="agregar-rol"
            name="rol"
            required
            defaultValue="operativo"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <SubmitBtn />
      </div>

      {state.error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="mt-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Vinculando…" : "Vincular"}
    </Button>
  );
}
