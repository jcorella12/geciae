"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ETIQUETA_CATEGORIA_COSTO,
  ETIQUETA_TIPO_COSTO_IMPUTADO,
} from "@/lib/proyecto-pnl/state";

import { agregarCostoImputado } from "./actions";

export function CostoImputadoForm({
  proyectoId,
  empresaId,
}: {
  proyectoId: string;
  empresaId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleSubmit(formData: FormData) {
    formData.set("proyecto_id", proyectoId);
    formData.set("empresa_id", empresaId);
    startTransition(async () => {
      const r = await agregarCostoImputado(formData);
      setMsg(r.ok ? "✓ Agregado" : `✗ ${r.error}`);
      if (r.ok) setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} size="sm">
        + Agregar costo manual
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <Label>Fecha *</Label>
        <Input
          name="fecha"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div>
        <Label>Tipo *</Label>
        <select
          name="tipo"
          required
          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {Object.entries(ETIQUETA_TIPO_COSTO_IMPUTADO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Categoría *</Label>
        <select
          name="categoria"
          required
          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {Object.entries(ETIQUETA_CATEGORIA_COSTO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Monto *</Label>
        <Input name="monto" type="number" step="0.01" min="0" required />
      </div>
      <div className="col-span-2">
        <Label>Concepto *</Label>
        <Input name="concepto" required minLength={3} maxLength={500} />
      </div>
      <div className="col-span-2">
        <Label>Justificación * (mínimo 5 caracteres)</Label>
        <textarea
          name="justificacion"
          required
          minLength={5}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {msg && (
        <p
          className={`col-span-2 text-[12px] ${
            msg.startsWith("✓") ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {msg}
        </p>
      )}
      <div className="col-span-2 flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Agregando…" : "Agregar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
