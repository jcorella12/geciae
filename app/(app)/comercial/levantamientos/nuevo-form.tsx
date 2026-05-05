"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialLevantamientoState } from "@/lib/levantamientos/state";

import { crearLevantamiento } from "./actions";

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

type Cliente = { id: string; razon_social: string };
type Oportunidad = {
  id: string;
  nombre: string;
  empresa_id: string;
  cliente_id: string;
};
type Usuario = { id: string; email: string };

export function NuevoLevantamientoForm({
  empresas,
  clientes,
  oportunidades,
  ingenieros,
}: {
  empresas: Empresa[];
  clientes: Cliente[];
  oportunidades: Oportunidad[];
  ingenieros: Usuario[];
}) {
  const [state, formAction] = useFormState(
    crearLevantamiento,
    initialLevantamientoState,
  );
  const [open, setOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState<string>(empresas[0]?.id ?? "");

  const clientesEmpresa = clientes.filter(() => true); // clientes son globales
  const oportunidadesEmpresa = oportunidades.filter(
    (o) => o.empresa_id === empresaId,
  );

  if (!open) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-base font-semibold">Levantamientos</h2>
          <p className="text-sm text-muted-foreground">
            Programa un levantamiento técnico. Su costo se asigna al sub-centro
            del vendedor.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Nuevo levantamiento</Button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      key={state.ok ? "reset" : "form"}
      className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <h2 className="text-base font-semibold">Nuevo levantamiento</h2>
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
        <div className="space-y-2">
          <Label htmlFor="empresa_id">Empresa</Label>
          <select
            id="empresa_id"
            name="empresa_id"
            required
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} — {e.nombre_comercial ?? e.razon_social}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cliente_id">Cliente (opcional)</Label>
          <select
            id="cliente_id"
            name="cliente_id"
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— sin asignar —</option>
            {clientesEmpresa.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razon_social}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="oportunidad_id">Oportunidad (opcional)</Label>
          <select
            id="oportunidad_id"
            name="oportunidad_id"
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— sin asignar —</option>
            {oportunidadesEmpresa.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ingeniero_id">Ingeniero asignado (opcional)</Label>
          <select
            id="ingeniero_id"
            name="ingeniero_id"
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— por asignar —</option>
            {ingenieros.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fecha_solicitud">Fecha solicitud</Label>
          <Input
            id="fecha_solicitud"
            name="fecha_solicitud"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_propuesta">
            Fecha propuesta (opcional)
          </Label>
          <Input
            id="fecha_propuesta"
            name="fecha_propuesta"
            type="date"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={2}
          maxLength={2000}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Dirección, contexto, requisitos especiales"
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          Levantamiento creado.
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
      {pending ? "Creando…" : "Crear levantamiento"}
    </Button>
  );
}
