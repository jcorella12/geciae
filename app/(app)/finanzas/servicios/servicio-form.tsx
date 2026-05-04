"use client";

import { Plus } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { crearServicio, initialServicioState } from "./actions";

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

export function ServicioForm({ empresas }: { empresas: Empresa[] }) {
  const [state, formAction] = useFormState(crearServicio, initialServicioState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="mb-6">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo servicio
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
      <h2 className="text-base font-semibold">Nuevo servicio</h2>

      <fieldset className="mt-4 space-y-2">
        <legend className="text-sm font-medium">
          Empresa que presta el servicio
        </legend>
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
          <Label htmlFor="codigo">Código</Label>
          <Input id="codigo" name="codigo" required placeholder="MANT-SOLAR-01" className="font-mono" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required placeholder="Mantenimiento sistema solar 50kW" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="unidad">Unidad</Label>
          <Input id="unidad" name="unidad" placeholder="servicio, m², hora, kWp" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="costo_base">Costo base interno (MXN)</Label>
          <Input
            id="costo_base"
            name="costo_base"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="5000"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="margen_inter_co">Margen inter-co (0-1)</Label>
          <Input
            id="margen_inter_co"
            name="margen_inter_co"
            type="number"
            min="0"
            max="1"
            step="0.01"
            defaultValue="0.15"
          />
          <p className="text-xs text-muted-foreground">
            0.15 = +15% sobre costo base.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="precio_externo">Precio externo (opcional, MXN)</Label>
          <Input
            id="precio_externo"
            name="precio_externo"
            type="number"
            min="0"
            step="0.01"
          />
          <p className="text-xs text-muted-foreground">
            Tarifa para clientes externos (no aplica para OT inter-co).
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="clave_sat">Clave SAT</Label>
          <Input id="clave_sat" name="clave_sat" placeholder="83121705" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="unidad_sat">Unidad SAT</Label>
          <Input id="unidad_sat" name="unidad_sat" placeholder="E48" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="descripcion">Descripción (opcional)</Label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
      {pending ? "Guardando…" : "Crear servicio"}
    </Button>
  );
}
