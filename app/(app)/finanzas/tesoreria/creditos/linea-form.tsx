"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialLineaState } from "@/lib/prestamos/state";

import { crearLineaCredito } from "./actions";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

export function LineaForm({ empresas }: { empresas: Empresa[] }) {
  const [state, formAction] = useFormState(crearLineaCredito, initialLineaState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="mb-6">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva línea de crédito
        </Button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm"
      key={state.ok ? "reset" : "form"}
    >
      <h2 className="text-base font-semibold">Nueva línea de crédito inter-co</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Marco entre dos empresas del grupo. Sobre la línea se solicitan
        disposiciones (préstamos individuales). La tasa = TIIE 28 + spread.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Empresa acreedora (presta)</legend>
          <div className="grid gap-2">
            {empresas.map((e) => (
              <label
                key={`acr-${e.id}`}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
              >
                <input
                  type="radio"
                  name="empresa_acreedora_id"
                  value={e.id}
                  required
                  className="h-4 w-4"
                />
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
                  }`}
                />
                <span className="truncate">{e.nombre_comercial ?? e.razon_social}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Empresa deudora (recibe)</legend>
          <div className="grid gap-2">
            {empresas.map((e) => (
              <label
                key={`deu-${e.id}`}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
              >
                <input
                  type="radio"
                  name="empresa_deudora_id"
                  value={e.id}
                  required
                  className="h-4 w-4"
                />
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
                  }`}
                />
                <span className="truncate">{e.nombre_comercial ?? e.razon_social}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="monto_autorizado">Monto autorizado (MXN)</Label>
          <Input
            id="monto_autorizado"
            name="monto_autorizado"
            type="number"
            step="0.01"
            min="0.01"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vigencia_inicio">Vigencia inicio</Label>
          <Input
            id="vigencia_inicio"
            name="vigencia_inicio"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vigencia_fin">Vigencia fin</Label>
          <Input
            id="vigencia_fin"
            name="vigencia_fin"
            type="date"
            required
            defaultValue={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dia_corte">Día de corte</Label>
          <Input
            id="dia_corte"
            name="dia_corte"
            type="number"
            min="1"
            max="31"
            defaultValue="31"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="tasa_base">Tasa base</Label>
          <select
            id="tasa_base"
            name="tasa_base"
            defaultValue="tiie_28"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="tiie_28">TIIE 28</option>
            <option value="fija">Fija</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="spread">Spread (decimal)</Label>
          <Input
            id="spread"
            name="spread"
            type="number"
            step="0.0001"
            min="0"
            max="1"
            defaultValue="0.06"
          />
          <p className="text-xs text-muted-foreground">0.06 = 6 puntos</p>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="capitaliza_intereses"
            className="h-4 w-4 rounded border"
          />
          Capitaliza intereses
        </label>
      </div>

      <div className="mt-4 space-y-1">
        <Label htmlFor="observaciones">Observaciones</Label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={2}
          maxLength={500}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {state.error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <SubmitBtn />
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando…" : "Crear línea"}
    </Button>
  );
}
