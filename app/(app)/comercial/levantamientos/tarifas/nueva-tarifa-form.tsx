"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialSimpleLevState } from "@/lib/levantamientos/state";

import { crearTarifa } from "../actions";

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

const CONCEPTOS_SUGERIDOS = [
  { value: "hora_ingeniero", label: "Hora ingeniero", unidad: "hora" },
  { value: "kilometraje", label: "Kilometraje", unidad: "km" },
  { value: "viaticos_dia", label: "Viáticos por día", unidad: "día" },
  { value: "hora_tecnico", label: "Hora técnico", unidad: "hora" },
] as const;

export function NuevaTarifaForm({ empresas }: { empresas: Empresa[] }) {
  const [state, formAction] = useFormState(crearTarifa, initialSimpleLevState);
  const [open, setOpen] = useState(false);
  const [concepto, setConcepto] = useState<string>(CONCEPTOS_SUGERIDOS[0].value);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        Nueva tarifa
      </Button>
    );
  }

  const conceptoMatch = CONCEPTOS_SUGERIDOS.find((c) => c.value === concepto);

  return (
    <form
      action={formAction}
      key={state.ok ? "reset" : "form"}
      className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Nueva tarifa interna</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="empresa_id">Empresa</Label>
          <select
            id="empresa_id"
            name="empresa_id"
            required
            defaultValue={empresas[0]?.id ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} — {e.nombre_comercial ?? e.razon_social}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="concepto">Concepto</Label>
          <select
            id="concepto"
            name="concepto"
            required
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {CONCEPTOS_SUGERIDOS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            El cálculo de costo de levantamiento usa{" "}
            <code className="font-mono">hora_ingeniero</code> y{" "}
            <code className="font-mono">kilometraje</code>. Otros son
            informativos.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="unidad">Unidad</Label>
          <Input
            id="unidad"
            name="unidad"
            type="text"
            required
            maxLength={20}
            defaultValue={conceptoMatch?.unidad ?? ""}
            placeholder="hora / km / día"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="costo_unitario">Costo unitario (MXN)</Label>
          <Input
            id="costo_unitario"
            name="costo_unitario"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="450.00"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="vigente_desde">Vigente desde</Label>
          <Input
            id="vigente_desde"
            name="vigente_desde"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vigente_hasta">Vigente hasta (opcional)</Label>
          <Input
            id="vigente_hasta"
            name="vigente_hasta"
            type="date"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="observaciones">Observaciones</Label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={2}
          maxLength={500}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Justificación del costo, fuente, etc."
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          Tarifa creada.
        </p>
      )}

      <SubmitBtn />
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando…" : "Crear tarifa"}
    </Button>
  );
}
