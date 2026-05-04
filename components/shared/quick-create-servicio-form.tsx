"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { crearServicioRapido } from "@/app/(app)/finanzas/servicios/actions";

export type ServicioQuickItem = {
  id: string;
  empresa_id: string;
  codigo: string;
  nombre: string;
  unidad: string | null;
  costo_base: number | null;
  margen_inter_co: number | null;
  precio_inter_co: number | null;
};

/**
 * Mini-form para crear un servicio del catálogo desde un flujo padre
 * (p.ej. OT inter-co). Pensado para vivir dentro del modal del
 * QuickCreatePicker — campos mínimos, validación server-side.
 */
export function QuickCreateServicioForm({
  empresaId,
  empresaLabel,
  initialNombre,
  onCreated,
  onCancel,
}: {
  empresaId: string;
  empresaLabel?: string;
  initialNombre?: string;
  onCreated: (s: ServicioQuickItem) => void;
  onCancel: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState(initialNombre?.trim() ?? "");
  const [unidad, setUnidad] = useState("");
  const [costoBase, setCostoBase] = useState("");
  const [margen, setMargen] = useState("0.15");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!empresaId) {
      setError("Falta empresa destino. Selecciónala en el formulario padre.");
      return;
    }
    const costo = Number(costoBase);
    if (!Number.isFinite(costo) || costo < 0) {
      setError("Costo base inválido.");
      return;
    }
    const m = Number(margen);
    startTransition(async () => {
      const res = await crearServicioRapido({
        empresa_id: empresaId,
        codigo,
        nombre,
        unidad: unidad || null,
        costo_base: costo,
        margen_inter_co: Number.isFinite(m) ? m : 0.15,
      });
      if (!res.ok || !res.servicio) {
        setError(res.error ?? "No se pudo crear");
        return;
      }
      onCreated(res.servicio);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {empresaLabel && (
        <p className="text-[11.5px] text-ink-3">
          Empresa destino: <span className="font-medium">{empresaLabel}</span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="qc_codigo" className="text-[11.5px]">
            Código *
          </Label>
          <Input
            id="qc_codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            required
            maxLength={32}
            placeholder="SERV-001"
            autoFocus
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qc_unidad" className="text-[11.5px]">
            Unidad
          </Label>
          <Input
            id="qc_unidad"
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
            maxLength={20}
            placeholder="hora, m², servicio"
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="qc_nombre" className="text-[11.5px]">
          Nombre *
        </Label>
        <Input
          id="qc_nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          maxLength={120}
          placeholder="Mantenimiento preventivo FV"
          className="h-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="qc_costo" className="text-[11.5px]">
            Costo base (MXN) *
          </Label>
          <Input
            id="qc_costo"
            type="number"
            min="0"
            step="0.01"
            value={costoBase}
            onChange={(e) => setCostoBase(e.target.value)}
            required
            className="h-9 font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qc_margen" className="text-[11.5px]">
            Margen inter-co (0–1)
          </Label>
          <Input
            id="qc_margen"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={margen}
            onChange={(e) => setMargen(e.target.value)}
            className="h-9 font-mono"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creando…" : "Crear y seleccionar"}
        </Button>
      </div>
    </form>
  );
}
