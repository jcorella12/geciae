"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ETIQUETA_ACTIVIDAD,
  initialActividadState,
  type TipoActividadComercial,
} from "@/lib/oportunidades/state";

import { registrarActividad } from "../actions";

const TIPOS = Object.keys(ETIQUETA_ACTIVIDAD) as TipoActividadComercial[];

export function ActividadForm({
  oportunidadId,
  clienteId,
}: {
  oportunidadId: string;
  clienteId: string;
}) {
  const [state, formAction] = useFormState(
    registrarActividad,
    initialActividadState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<TipoActividadComercial>("llamada");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setTipo("llamada");
    }
  }, [state.ok]);

  const ahoraISO = new Date().toISOString().slice(0, 16);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="oportunidad_id" value={oportunidadId} />
      <input type="hidden" name="cliente_id" value={clienteId} />

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor="tipo" className="text-[11px]">
            Tipo
          </Label>
          <select
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoActividadComercial)}
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_ACTIVIDAD[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="fecha" className="text-[11px]">
            Fecha y hora
          </Label>
          <Input
            id="fecha"
            name="fecha"
            type="datetime-local"
            required
            defaultValue={ahoraISO}
            className="mt-0.5 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="duracion_minutos" className="text-[11px]">
            Duración (min)
          </Label>
          <Input
            id="duracion_minutos"
            name="duracion_minutos"
            type="number"
            min="0"
            placeholder="opcional"
            className="mt-0.5 text-sm"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="participantes" className="text-[11px]">
          Participantes
        </Label>
        <Input
          id="participantes"
          name="participantes"
          placeholder="Ej: Joaquín Corella, Cliente Pérez"
          className="mt-0.5 text-sm"
        />
      </div>

      <div>
        <Label htmlFor="notas" className="text-[11px]">
          Notas / Detalles *
        </Label>
        <textarea
          id="notas"
          name="notas"
          required
          rows={3}
          placeholder="Lo que se trató, acuerdos, próximos pasos…"
          className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <Label htmlFor="resultado" className="text-[11px]">
          Resultado
        </Label>
        <Input
          id="resultado"
          name="resultado"
          placeholder="Ej: Cotización solicitada · Sin interés · Pidió 2 semanas"
          className="mt-0.5 text-sm"
        />
      </div>

      {state.error && (
        <p className="text-[11px] text-destructive">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-[11px] text-emerald-700">✓ Actividad registrada</p>
      )}

      <div className="flex justify-end">
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Registrar actividad"}
    </Button>
  );
}
