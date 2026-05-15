"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  actualizarVinculo,
  desactivarVinculo,
  type ActualizarState,
} from "./actions";

const ROLES = [
  { value: "ceo", label: "CEO" },
  { value: "director", label: "Director / Gerente" },
  { value: "operativo", label: "Operativo" },
  { value: "empleado", label: "Empleado" },
  { value: "cliente", label: "Cliente" },
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

const initialState: ActualizarState = {
  ok: false,
  error: null,
  message: null,
};

export type VinculoEditable = {
  usuarioId: string;
  empresaId: string;
  empresaCodigo: string;
  empresaNombre: string;
  rol: string;
  atributos: string[];
  puesto: string | null;
  configuracion_atributos: Record<string, unknown>;
};

export function VinculoCard({ vinculo }: { vinculo: VinculoEditable }) {
  const [state, formAction] = useFormState(actualizarVinculo, initialState);
  const [desactivarState, desactivarAction] = useFormState(
    desactivarVinculo,
    initialState,
  );

  const [atributos, setAtributos] = useState<string[]>(vinculo.atributos);
  const tieneAprobador = atributos.includes("aprobador_financiero");

  const cfgAprobador =
    (vinculo.configuracion_atributos?.["aprobador_financiero"] as
      | {
          umbral_max_mxn_oc?: number | null;
          umbral_max_mxn_ot?: number | null;
          umbral_max_mxn_prestamo?: number | null;
        }
      | undefined) ?? {};

  const toggleAtributo = (value: string) => {
    setAtributos((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              empresaCodigoColor[vinculo.empresaCodigo] ?? "bg-muted-foreground"
            }`}
          />
          <div>
            <p className="text-sm font-semibold">
              {vinculo.empresaCodigo} · {vinculo.empresaNombre}
            </p>
            <p className="text-xs text-muted-foreground">
              ID empresa: <code className="font-mono">{vinculo.empresaId}</code>
            </p>
          </div>
        </div>

        <form action={desactivarAction}>
          <input type="hidden" name="usuarioId" value={vinculo.usuarioId} />
          <input type="hidden" name="empresaId" value={vinculo.empresaId} />
          <DesactivarBtn />
        </form>
      </header>

      {desactivarState.error && (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {desactivarState.error}
        </p>
      )}
      {desactivarState.message && (
        <p className="mb-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          {desactivarState.message}
        </p>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="usuarioId" value={vinculo.usuarioId} />
        <input type="hidden" name="empresaId" value={vinculo.empresaId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`rol-${vinculo.empresaId}`}>Rol</Label>
            <select
              id={`rol-${vinculo.empresaId}`}
              name="rol"
              defaultValue={vinculo.rol}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`puesto-${vinculo.empresaId}`}>Puesto</Label>
            <Input
              id={`puesto-${vinculo.empresaId}`}
              name="puesto"
              type="text"
              defaultValue={vinculo.puesto ?? ""}
              placeholder="Director Comercial"
            />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Atributos</legend>
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
                  checked={atributos.includes(a.value)}
                  onChange={() => toggleAtributo(a.value)}
                  className="h-4 w-4"
                />
                <span className="truncate">{a.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {tieneAprobador && (
          <fieldset className="space-y-3 rounded-md border border-border bg-secondary/30 p-4">
            <legend className="px-1 text-sm font-medium">
              Umbrales del aprobador financiero (MXN)
            </legend>
            <p className="text-xs text-muted-foreground">
              Dejar vacío = sin límite (CEO no requiere umbrales).
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor={`oc-${vinculo.empresaId}`}>
                  Umbral OC máx.
                </Label>
                <Input
                  id={`oc-${vinculo.empresaId}`}
                  name="umbralOc"
                  type="number"
                  min="0"
                  step="1000"
                  defaultValue={
                    cfgAprobador.umbral_max_mxn_oc ?? ""
                  }
                  placeholder="500000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`ot-${vinculo.empresaId}`}>
                  Umbral OT máx.
                </Label>
                <Input
                  id={`ot-${vinculo.empresaId}`}
                  name="umbralOt"
                  type="number"
                  min="0"
                  step="1000"
                  defaultValue={
                    cfgAprobador.umbral_max_mxn_ot ?? ""
                  }
                  placeholder="500000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`prestamo-${vinculo.empresaId}`}>
                  Umbral Préstamo máx.
                </Label>
                <Input
                  id={`prestamo-${vinculo.empresaId}`}
                  name="umbralPrestamo"
                  type="number"
                  min="0"
                  step="1000"
                  defaultValue={
                    cfgAprobador.umbral_max_mxn_prestamo ?? ""
                  }
                  placeholder="1000000"
                />
              </div>
            </div>
          </fieldset>
        )}

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

        <SubmitBtn />
      </form>
    </div>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? "Guardando…" : "Guardar"}
    </Button>
  );
}

function DesactivarBtn() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={(e) => {
        if (
          !confirm(
            "¿Desactivar este vínculo? Se conserva el histórico (soft-delete).",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "…" : "Desactivar vínculo"}
    </Button>
  );
}
