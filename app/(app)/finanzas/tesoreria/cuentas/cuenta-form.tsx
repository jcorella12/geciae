"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { crearCuenta } from "./actions";
import { initialCuentaState } from "./state";

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

export function CuentaForm({ empresas }: { empresas: Empresa[] }) {
  const [state, formAction] = useFormState(crearCuenta, initialCuentaState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="mb-6">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva cuenta bancaria
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
      <h2 className="text-base font-semibold">Nueva cuenta bancaria</h2>

      <fieldset className="mt-4 space-y-2">
        <legend className="text-sm font-medium">Empresa titular</legend>
        <div className="grid grid-cols-2 gap-2">
          {empresas.map((e) => (
            <label
              key={e.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
            >
              <input type="radio" name="empresa_id" value={e.id} required className="h-4 w-4" />
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

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="banco">Banco</Label>
          <Input id="banco" name="banco" required placeholder="BBVA, Banamex, Banorte…" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="numero_cuenta">Número de cuenta</Label>
          <Input id="numero_cuenta" name="numero_cuenta" required className="font-mono" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="clabe">CLABE</Label>
          <Input id="clabe" name="clabe" maxLength={18} placeholder="18 dígitos" className="font-mono" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="alias">Alias / referencia</Label>
          <Input id="alias" name="alias" placeholder="Cuenta operativa principal" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tipo">Tipo</Label>
          <select
            id="tipo"
            name="tipo"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Sin clasificar —</option>
            <option value="cheques">Cheques</option>
            <option value="ahorro">Ahorro</option>
            <option value="inversion">Inversión</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="saldo_inicial">Saldo inicial (MXN)</Label>
          <Input
            id="saldo_inicial"
            name="saldo_inicial"
            type="number"
            step="0.01"
            defaultValue="0"
          />
        </div>
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
      {pending ? "Guardando…" : "Crear cuenta"}
    </Button>
  );
}
