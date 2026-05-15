"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { invitarUsuario, type InvitarState } from "./actions";

const ROLES = [
  { value: "ceo", label: "CEO" },
  { value: "director", label: "Director / Gerente" },
  { value: "operativo", label: "Operativo (PM, Vendedor, Supervisor)" },
  { value: "empleado", label: "Empleado" },
  { value: "cliente", label: "Cliente (portal externo)" },
] as const;

const ATRIBUTOS = [
  { value: "aprobador_financiero", label: "Aprobador financiero" },
  { value: "coordinador_calidad", label: "Coordinador de calidad" },
  { value: "tesorero_corporativo", label: "Tesorero corporativo" },
  { value: "auditor_interno", label: "Auditor interno" },
  { value: "vendedor", label: "Vendedor" },
  { value: "supervisor_cuadrilla", label: "Supervisor de cuadrilla" },
  { value: "rh", label: "Recursos humanos" },
  { value: "contralor", label: "Contralor" },
] as const;

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const initialState: InvitarState = { ok: false, error: null, message: null };

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

export function InvitarForm({ empresas }: { empresas: Empresa[] }) {
  const [state, formAction] = useFormState(invitarUsuario, initialState);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-sm"
      key={state.ok ? "reset" : "form"}
    >
      <div>
        <h2 className="text-base font-semibold">Invitar usuario</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Envía un correo con magic link para que el usuario configure su
          contraseña y entre al sistema.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="usuario@empresa.com.mx"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="puesto">Puesto (opcional)</Label>
          <Input
            id="puesto"
            name="puesto"
            type="text"
            placeholder="Director Comercial PSENERGIA"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rol">Rol base</Label>
        <select
          id="rol"
          name="rol"
          required
          defaultValue="operativo"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Empresas</legend>
        <div className="grid grid-cols-2 gap-2">
          {empresas.map((e) => (
            <label
              key={e.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
            >
              <input
                type="checkbox"
                name="empresaIds"
                value={e.id}
                className="h-4 w-4"
              />
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
                }`}
              />
              <span className="truncate">
                {e.nombre_comercial ?? e.razon_social}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Atributos (opcionales)
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {ATRIBUTOS.map((a) => (
            <label
              key={a.value}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
            >
              <input
                type="checkbox"
                name="atributos"
                value={a.value}
                className="h-4 w-4"
              />
              <span className="truncate">{a.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Umbrales de aprobador_financiero se configuran en una pantalla
          posterior (TODO Sprint 1C).
        </p>
      </fieldset>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enviando…" : "Invitar"}
    </Button>
  );
}
