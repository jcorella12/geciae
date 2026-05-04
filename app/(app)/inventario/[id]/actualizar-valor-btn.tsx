"use client";

import { TrendingUp } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { actualizarValorMercado } from "../actions";

export function ActualizarValorBtn({
  itemId,
  empresaId,
  valorActual,
  fuenteActual,
}: {
  itemId: string;
  empresaId: string;
  valorActual: number | null;
  fuenteActual: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(valorActual?.toString() ?? "");
  const [fuente, setFuente] = useState(fuenteActual ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onGuardar = () => {
    const num = parseFloat(valor);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Valor inválido");
      return;
    }
    startTransition(async () => {
      const r = await actualizarValorMercado(itemId, empresaId, num, fuente || null);
      if (!r.ok) {
        setError(r.error ?? "Error");
      } else {
        setError(null);
        setOpen(false);
      }
    });
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <TrendingUp className="h-3.5 w-3.5" />
        Actualizar valor mercado
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border border-brand bg-brand-soft/30 p-2.5">
      <div>
        <Label className="text-[11px]">Nuevo valor (MXN)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="mt-0.5 h-8 w-32 text-sm tnum"
        />
      </div>
      <div>
        <Label className="text-[11px]">Fuente</Label>
        <Input
          value={fuente}
          onChange={(e) => setFuente(e.target.value)}
          placeholder="Cotización X"
          className="mt-0.5 h-8 w-48 text-sm"
        />
      </div>
      <Button size="sm" onClick={onGuardar} disabled={pending}>
        {pending ? "…" : "Guardar"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
      >
        Cancelar
      </Button>
      {error && (
        <p className="w-full text-[11px] text-destructive">{error}</p>
      )}
    </div>
  );
}
