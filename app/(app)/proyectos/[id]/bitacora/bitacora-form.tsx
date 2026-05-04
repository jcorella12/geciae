"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ETIQUETA_TIPO_BITACORA,
  initialSimpleFormState,
  type TipoEventoBitacora,
} from "@/lib/proyecto-extras/state";

import { registrarEventoBitacora } from "./actions";

const TIPOS = Object.keys(ETIQUETA_TIPO_BITACORA) as TipoEventoBitacora[];

export function BitacoraForm({ proyectoId }: { proyectoId: string }) {
  const [state, formAction] = useFormState(
    registrarEventoBitacora,
    initialSimpleFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  const ahora = new Date().toISOString().slice(0, 16);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-md border border-border bg-card p-4 shadow-sm"
    >
      <input type="hidden" name="proyecto_id" value={proyectoId} />

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 md:col-span-3">
          <Label htmlFor="tipo" className="text-[11px]">
            Tipo
          </Label>
          <select
            id="tipo"
            name="tipo"
            defaultValue="nota"
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_BITACORA[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-12 md:col-span-4">
          <Label htmlFor="fecha" className="text-[11px]">
            Fecha y hora
          </Label>
          <Input
            id="fecha"
            name="fecha"
            type="datetime-local"
            defaultValue={ahora}
            className="mt-0.5 text-sm"
          />
        </div>
        <div className="col-span-12 md:col-span-5">
          <Label htmlFor="titulo" className="text-[11px]">
            Título (opcional)
          </Label>
          <Input
            id="titulo"
            name="titulo"
            placeholder="Resumen breve"
            className="mt-0.5 text-sm"
          />
        </div>

        <div className="col-span-12">
          <Label htmlFor="descripcion" className="text-[11px]">
            Descripción *
          </Label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            required
            placeholder="Detalla el evento, decisión, problema o avance…"
            className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <div className="col-span-12 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 text-[12px]">
            <input
              type="checkbox"
              name="es_critica"
              className="h-4 w-4"
            />
            Marcar como crítica
          </label>
          <label className="flex items-center gap-1.5 text-[12px]">
            <input
              type="checkbox"
              name="visible_cliente"
              className="h-4 w-4"
            />
            Visible para cliente
          </label>
          <div className="ml-auto">
            <SubmitBtn />
          </div>
        </div>
      </div>

      {state.error && (
        <p className="mt-2 text-[11px] text-destructive">{state.error}</p>
      )}
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Registrar evento"}
    </Button>
  );
}
