"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialTareaState } from "@/lib/proyecto-tareas/state";

import { crearTarea } from "./actions";

export function NuevaTareaForm({
  proyectoId,
  onCreated,
}: {
  proyectoId: string;
  onCreated?: () => void;
}) {
  const [state, formAction] = useFormState(crearTarea, initialTareaState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onCreated?.();
    }
  }, [state.ok, onCreated]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <input type="hidden" name="proyecto_id" value={proyectoId} />
      <h3 className="mb-3 text-sm font-medium">Nueva tarea / hito</h3>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 md:col-span-6">
          <Label htmlFor="titulo" className="text-[11px]">
            Título *
          </Label>
          <Input
            id="titulo"
            name="titulo"
            required
            placeholder="Ej: Diseño eléctrico, Trámite CFE, Entrega de equipo…"
            className="mt-0.5 text-sm"
          />
        </div>
        <div className="col-span-6 md:col-span-2">
          <Label htmlFor="estado" className="text-[11px]">
            Estado
          </Label>
          <select
            id="estado"
            name="estado"
            defaultValue="pendiente"
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En curso</option>
            <option value="bloqueada">Bloqueada</option>
            <option value="completada">Completada</option>
          </select>
        </div>
        <div className="col-span-6 md:col-span-2">
          <Label htmlFor="prioridad" className="text-[11px]">
            Prioridad
          </Label>
          <select
            id="prioridad"
            name="prioridad"
            defaultValue="media"
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div className="col-span-12 flex items-center gap-2 md:col-span-2 md:mt-5">
          <input
            id="es_hito"
            name="es_hito"
            type="checkbox"
            className="h-4 w-4"
          />
          <Label htmlFor="es_hito" className="text-[12px]">
            Es hito
          </Label>
        </div>

        <div className="col-span-6 md:col-span-3">
          <Label htmlFor="fecha_inicio_planeada" className="text-[11px]">
            Inicio planeado
          </Label>
          <Input
            id="fecha_inicio_planeada"
            name="fecha_inicio_planeada"
            type="date"
            className="mt-0.5 text-sm"
          />
        </div>
        <div className="col-span-6 md:col-span-3">
          <Label htmlFor="fecha_fin_planeada" className="text-[11px]">
            Fin planeado
          </Label>
          <Input
            id="fecha_fin_planeada"
            name="fecha_fin_planeada"
            type="date"
            className="mt-0.5 text-sm"
          />
        </div>
        <div className="col-span-6 md:col-span-2">
          <Label htmlFor="horas_estimadas" className="text-[11px]">
            Horas est.
          </Label>
          <Input
            id="horas_estimadas"
            name="horas_estimadas"
            type="number"
            step="0.5"
            min="0"
            className="mt-0.5 text-sm tnum"
          />
        </div>
        <div className="col-span-6 md:col-span-2">
          <Label htmlFor="costo_estimado" className="text-[11px]">
            Costo est.
          </Label>
          <Input
            id="costo_estimado"
            name="costo_estimado"
            type="number"
            step="0.01"
            min="0"
            className="mt-0.5 text-sm tnum"
          />
        </div>
        <div className="col-span-6 md:col-span-2">
          <Label htmlFor="porcentaje_avance" className="text-[11px]">
            % Avance
          </Label>
          <Input
            id="porcentaje_avance"
            name="porcentaje_avance"
            type="number"
            min="0"
            max="100"
            defaultValue="0"
            className="mt-0.5 text-sm tnum"
          />
        </div>

        <div className="col-span-12">
          <Label htmlFor="descripcion" className="text-[11px]">
            Descripción
          </Label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={2}
            className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {state.error && (
        <p className="mt-2 text-[11px] text-destructive">{state.error}</p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Crear tarea"}
    </Button>
  );
}
