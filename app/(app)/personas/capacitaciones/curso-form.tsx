"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { crearCurso } from "./actions";
import { MODALIDADES } from "./state";

export function CursoForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setOk(false);
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await crearCurso(fd);
      if (!r.ok) {
        setError(r.error ?? "Error desconocido");
        return;
      }
      setOk(true);
      form.reset();
      setTimeout(() => setOk(false), 3000);
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="default">
        <Plus className="mr-1.5 h-4 w-4" />
        Agregar curso al catálogo
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">Nuevo curso</h2>
          <p className="text-xs text-muted-foreground">
            Lo agregarás al catálogo. Luego desde la ficha del empleado podrás
            asignárselo.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setError(null);
            setOk(false);
          }}
        >
          Cerrar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="codigo">Código</Label>
          <Input
            id="codigo"
            name="codigo"
            required
            maxLength={40}
            placeholder="SST-001"
            className="font-mono uppercase"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            required
            maxLength={120}
            placeholder="Seguridad e higiene básica"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={2}
          maxLength={2000}
          placeholder="Temario general, requisitos previos, etc."
          className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="modalidad">Modalidad</Label>
          <select
            id="modalidad"
            name="modalidad"
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">—</option>
            {MODALIDADES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duracion_horas">Duración (horas)</Label>
          <Input
            id="duracion_horas"
            name="duracion_horas"
            type="number"
            step="0.5"
            min="0"
            placeholder="8"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="costo">Costo (MXN)</Label>
          <Input
            id="costo"
            name="costo"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="instructor_externo">Instructor externo</Label>
          <Input
            id="instructor_externo"
            name="instructor_externo"
            maxLength={120}
            placeholder="Nombre del instructor o proveedor"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vigencia_constancia_meses">
            Vigencia de constancia (meses)
          </Label>
          <Input
            id="vigencia_constancia_meses"
            name="vigencia_constancia_meses"
            type="number"
            step="1"
            min="1"
            max="120"
            placeholder="12 (déjalo vacío si no vence)"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="genera_dc3"
          className="h-4 w-4 rounded border-border"
        />
        Genera constancia DC-3 (STPS)
      </label>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {ok && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ✓ Curso agregado al catálogo.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Agregar curso"}
        </Button>
      </div>
    </form>
  );
}
