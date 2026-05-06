"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  actualizarAlmacen,
  crearAlmacen,
  initialAlmacenState,
} from "./actions";

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

type Persona = {
  id: string;
  nombre: string;
};

type Defaults = {
  empresa_id?: string;
  codigo?: string;
  nombre?: string;
  tipo?: string;
  responsable_id?: string | null;
  direccion_calle?: string | null;
  direccion_ciudad?: string | null;
  direccion_estado?: string | null;
  direccion_cp?: string | null;
  activo?: boolean;
};

export function AlmacenForm({
  empresas,
  responsables,
  almacenId,
  defaults,
}: {
  empresas: Empresa[];
  responsables: Persona[];
  almacenId?: string;
  defaults?: Defaults;
}) {
  const router = useRouter();
  const action = almacenId
    ? actualizarAlmacen.bind(null, almacenId)
    : crearAlmacen;
  const [state, formAction] = useFormState(action, initialAlmacenState);

  useEffect(() => {
    if (state.ok && state.id && !almacenId) {
      router.push(`/inventario/almacenes/${state.id}`);
    }
  }, [state.ok, state.id, almacenId, router]);

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Identificación</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <Label htmlFor="empresa_id" className="text-sm">
              Empresa *
            </Label>
            <select
              id="empresa_id"
              name="empresa_id"
              required
              defaultValue={defaults?.empresa_id ?? ""}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Selecciona —</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} · {e.nombre_comercial ?? e.razon_social}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="codigo" className="text-sm">
              Código *
            </Label>
            <Input
              id="codigo"
              name="codigo"
              required
              defaultValue={defaults?.codigo ?? ""}
              placeholder="ALM-PRINCIPAL"
              className="mt-1 font-mono uppercase"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="nombre" className="text-sm">
              Nombre *
            </Label>
            <Input
              id="nombre"
              name="nombre"
              required
              defaultValue={defaults?.nombre ?? ""}
              placeholder="Almacén Principal · Bodega Hermosillo"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tipo" className="text-sm">
              Tipo
            </Label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={defaults?.tipo ?? "principal"}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="principal">Principal</option>
              <option value="obra">Obra</option>
              <option value="virtual_cuadrilla">Virtual (cuadrilla)</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="responsable_id" className="text-sm">
              Responsable
            </Label>
            <select
              id="responsable_id"
              name="responsable_id"
              defaultValue={defaults?.responsable_id ?? ""}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Sin asignar —</option>
              {responsables.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Dirección</h2>
        <div className="mt-4 grid grid-cols-4 gap-3">
          <div className="col-span-4">
            <Label htmlFor="direccion_calle" className="text-sm">
              Calle y número
            </Label>
            <Input
              id="direccion_calle"
              name="direccion_calle"
              defaultValue={defaults?.direccion_calle ?? ""}
              placeholder="Blvd. Solidaridad #123"
              className="mt-1"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="direccion_ciudad" className="text-sm">
              Ciudad
            </Label>
            <Input
              id="direccion_ciudad"
              name="direccion_ciudad"
              defaultValue={defaults?.direccion_ciudad ?? ""}
              placeholder="Hermosillo"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="direccion_estado" className="text-sm">
              Estado
            </Label>
            <Input
              id="direccion_estado"
              name="direccion_estado"
              defaultValue={defaults?.direccion_estado ?? "Sonora"}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="direccion_cp" className="text-sm">
              CP
            </Label>
            <Input
              id="direccion_cp"
              name="direccion_cp"
              defaultValue={defaults?.direccion_cp ?? ""}
              placeholder="83000"
              className="mt-1 font-mono"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="activo"
            defaultChecked={defaults?.activo ?? true}
            className="mt-1 h-4 w-4 rounded border-input"
          />
          <div>
            <p className="text-sm font-medium">Activo</p>
            <p className="text-[12px] text-ink-3">
              Solo los almacenes activos aparecen al registrar movimientos de
              inventario. Si lo desactivas, el stock se queda pero ya no se
              puede agregar/sacar producto.
            </p>
          </div>
        </label>
      </section>

      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.ok && almacenId && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ✓ Cambios guardados.
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-ink-3 hover:text-ink-1"
        >
          Cancelar
        </button>
        <SubmitBtn edit={Boolean(almacenId)} />
      </div>
    </form>
  );
}

function SubmitBtn({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? edit
          ? "Guardando…"
          : "Creando…"
        : edit
          ? "Guardar cambios"
          : "Crear almacén"}
    </Button>
  );
}
