"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ETIQUETA_EVENTO_VEHICULO,
  initialBitacoraState,
  type TipoEventoVehiculo,
} from "@/lib/vehiculos/state";

import { registrarBitacora } from "../actions";

const TIPOS = Object.keys(ETIQUETA_EVENTO_VEHICULO) as TipoEventoVehiculo[];

export function BitacoraForm({
  vehiculoId,
  kmActual,
  empleados,
  empleadoAsignadoId,
}: {
  vehiculoId: string;
  kmActual: number;
  empleados: Array<{ id: string; nombre_completo: string; puesto: string | null }>;
  empleadoAsignadoId: string | null;
}) {
  const [state, formAction] = useFormState(
    registrarBitacora,
    initialBitacoraState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<TipoEventoVehiculo>("carga_combustible");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setTipo("carga_combustible");
    }
  }, [state.ok]);

  const today = new Date().toISOString().slice(0, 10);
  const isCombustible = tipo === "carga_combustible";

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="vehiculo_id" value={vehiculoId} />

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor="tipo" className="text-[11px]">
            Tipo
          </Label>
          <select
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoEventoVehiculo)}
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_EVENTO_VEHICULO[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="fecha" className="text-[11px]">
            Fecha
          </Label>
          <Input
            id="fecha"
            name="fecha"
            type="date"
            required
            defaultValue={today}
            className="mt-0.5 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="km_lectura" className="text-[11px]">
            Lectura km (actual: {kmActual.toLocaleString("es-MX")})
          </Label>
          <Input
            id="km_lectura"
            name="km_lectura"
            type="number"
            min="0"
            placeholder="opcional"
            className="mt-0.5 text-sm tnum"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label htmlFor="descripcion" className="text-[11px]">
            Descripción *
          </Label>
          <Input
            id="descripcion"
            name="descripcion"
            required
            placeholder="Ej: Carga 30L Magna · Mantenimiento de 10,000km"
            className="mt-0.5 text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="empleado_id" className="text-[11px]">
            Empleado{" "}
            <span className="text-ink-4">
              (default: {empleadoAsignadoId ? "asignado al vehículo" : "ninguno"})
            </span>
          </Label>
          <select
            id="empleado_id"
            name="empleado_id"
            defaultValue={empleadoAsignadoId ?? ""}
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— Sin asignar —</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre_completo}
                {e.puesto ? ` · ${e.puesto}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isCombustible && (
        <div className="grid grid-cols-3 gap-2 rounded-md bg-bg-2 p-2">
          <div>
            <Label htmlFor="litros" className="text-[11px]">
              Litros
            </Label>
            <Input
              id="litros"
              name="litros"
              type="number"
              step="0.001"
              min="0"
              className="mt-0.5 text-sm tnum"
            />
          </div>
          <div>
            <Label htmlFor="precio_por_litro" className="text-[11px]">
              Precio por litro
            </Label>
            <Input
              id="precio_por_litro"
              name="precio_por_litro"
              type="number"
              step="0.01"
              min="0"
              className="mt-0.5 text-sm tnum"
            />
          </div>
          <div>
            <Label htmlFor="monto" className="text-[11px]">
              Monto total
            </Label>
            <Input
              id="monto"
              name="monto"
              type="number"
              step="0.01"
              min="0"
              className="mt-0.5 text-sm tnum"
            />
          </div>
        </div>
      )}

      {!isCombustible && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="monto" className="text-[11px]">
              Monto
            </Label>
            <Input
              id="monto"
              name="monto"
              type="number"
              step="0.01"
              min="0"
              className="mt-0.5 text-sm tnum"
            />
          </div>
          <div>
            <Label htmlFor="proveedor_nombre" className="text-[11px]">
              Proveedor
            </Label>
            <Input
              id="proveedor_nombre"
              name="proveedor_nombre"
              placeholder="Taller, gasolinera, etc."
              className="mt-0.5 text-sm"
            />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="observaciones" className="text-[11px]">
          Observaciones
        </Label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={2}
          className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {state.error && (
        <p className="text-[11px] text-destructive">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-[11px] text-emerald-700">✓ Evento registrado</p>
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
      {pending ? "Guardando…" : "Registrar"}
    </Button>
  );
}
