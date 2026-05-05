"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ETIQUETA_TIPO_BONO,
  initialBonoState,
  TIPOS_BONO,
} from "@/lib/portal-empleado/state";

import { crearBonoManual } from "./actions";

export function NuevoBonoForm({ empleadoId }: { empleadoId: string }) {
  const [state, formAction] = useFormState(crearBonoManual, initialBonoState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Nuevo bono
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      key={state.ok ? "reset" : "form"}
      className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <input type="hidden" name="empleado_id" value={empleadoId} />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Nuevo bono manual</h3>
          <p className="text-xs text-muted-foreground">
            Bono en efectivo NO timbrado. Visible para el empleado y director.
          </p>
        </div>
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
          <Label htmlFor="tipo">Tipo</Label>
          <select
            id="tipo"
            name="tipo"
            required
            defaultValue="productividad"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TIPOS_BONO.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_BONO[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha_pago">Fecha de pago</Label>
          <Input
            id="fecha_pago"
            name="fecha_pago"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="concepto">Concepto</Label>
        <Input
          id="concepto"
          name="concepto"
          type="text"
          required
          maxLength={200}
          placeholder="Bono fin de año"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="monto">Monto (MXN)</Label>
          <Input
            id="monto"
            name="monto"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="5000.00"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="comprobante_url">Comprobante URL (opcional)</Label>
          <Input
            id="comprobante_url"
            name="comprobante_url"
            type="url"
            placeholder="https://drive.google.com/..."
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="motivo">Motivo / observaciones</Label>
        <textarea
          id="motivo"
          name="motivo"
          rows={2}
          maxLength={2000}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Justificación del bono"
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          Bono registrado.
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
      {pending ? "Guardando…" : "Crear bono"}
    </Button>
  );
}
