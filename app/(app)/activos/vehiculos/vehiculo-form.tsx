"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { DraftRecoveryBanner } from "@/components/shared/draft-recovery-banner";
import { EmpleadoPicker } from "@/components/shared/empleado-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormDraftDom } from "@/lib/hooks/use-form-draft-dom";
import { initialVehiculoState } from "@/lib/vehiculos/state";

import { actualizarVehiculo, crearVehiculo } from "./actions";

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

type GastoRec = {
  id: string;
  empresa_id: string;
  descripcion: string;
  monto: number | null;
};

type EmpleadoOpt = {
  id: string;
  empresa_id: string;
  nombre_completo: string;
  puesto: string | null;
};

type Defaults = {
  empresa_id?: string;
  placa?: string | null;
  numero_economico?: string | null;
  serie?: string | null;
  marca?: string;
  modelo?: string;
  anio?: number | null;
  color?: string | null;
  tipo?: string | null;
  uso?: string | null;
  combustible?: string | null;
  tipo_propiedad?: string;
  fecha_adquisicion?: string | null;
  costo_adquisicion?: number | null;
  proveedor_id?: string | null;
  gasto_recurrente_id?: string | null;
  fecha_termino_contrato?: string | null;
  estatus?: string;
  km_actual?: number | null;
  poliza_seguro?: string | null;
  fecha_vencimiento_seguro?: string | null;
  asignado_a?: string | null;
  empleado_id?: string | null;
  observaciones?: string | null;
};

export function VehiculoForm({
  empresas,
  gastosRecurrentes,
  empleados,
  vehiculoId,
  defaults,
}: {
  empresas: Empresa[];
  gastosRecurrentes: GastoRec[];
  empleados: EmpleadoOpt[];
  vehiculoId?: string;
  defaults?: Defaults;
}) {
  const router = useRouter();
  const action = vehiculoId
    ? actualizarVehiculo.bind(null, vehiculoId)
    : crearVehiculo;
  const [state, formAction] = useFormState(action, initialVehiculoState);

  // Empresa seleccionada — controla el filtrado del selector de empleado
  // (un empleado solo se asigna a vehículos de su misma empresa).
  const [empresaSel, setEmpresaSel] = useState<string>(
    defaults?.empresa_id ?? "",
  );
  const [empleadoIdSel, setEmpleadoIdSel] = useState<string>(
    defaults?.empleado_id ?? "",
  );
  // Si cambia la empresa y el empleado seleccionado no pertenece a esa
  // empresa, limpiar la selección (consistencia con la regla del form).
  useEffect(() => {
    if (!empresaSel) return;
    const sel = empleados.find((e) => e.id === empleadoIdSel);
    if (sel && sel.empresa_id !== empresaSel) {
      setEmpleadoIdSel("");
    }
  }, [empresaSel, empleadoIdSel, empleados]);

  useEffect(() => {
    if (state.ok && state.id) {
      router.push(`/activos/vehiculos/${state.id}`);
    }
  }, [state.ok, state.id, router]);

  const formRef = useRef<HTMLFormElement>(null);
  const formKey = `vehiculo-form-${vehiculoId ?? "nuevo"}`;
  const { showBanner, onInput, applyDraft, discardDraft, clearDraft } =
    useFormDraftDom(formRef, formKey);

  useEffect(() => {
    if (state.ok) clearDraft();
  }, [state.ok, clearDraft]);

  return (
    <>
      {showBanner && (
        <DraftRecoveryBanner
          onRestore={applyDraft}
          onDiscard={discardDraft}
          label="Tienes un borrador sin guardar de este vehículo. ¿Restaurarlo?"
        />
      )}
      <form
        ref={formRef}
        action={formAction}
        onInput={onInput}
        onSubmit={() => clearDraft()}
        className="space-y-6"
      >
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
              value={empresaSel}
              onChange={(ev) => setEmpresaSel(ev.target.value)}
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
            <Label htmlFor="placa" className="text-sm">
              Placa
            </Label>
            <Input
              id="placa"
              name="placa"
              defaultValue={defaults?.placa ?? ""}
              placeholder="SON-1234"
              className="mt-1 font-mono uppercase"
            />
          </div>
          <div>
            <Label htmlFor="numero_economico" className="text-sm">
              Número económico
            </Label>
            <Input
              id="numero_economico"
              name="numero_economico"
              defaultValue={defaults?.numero_economico ?? ""}
              placeholder="C-12"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="serie" className="text-sm">
              VIN / Serie
            </Label>
            <Input
              id="serie"
              name="serie"
              defaultValue={defaults?.serie ?? ""}
              className="mt-1 font-mono text-xs"
            />
          </div>
          <div>
            <Label htmlFor="marca" className="text-sm">
              Marca *
            </Label>
            <Input
              id="marca"
              name="marca"
              required
              defaultValue={defaults?.marca ?? ""}
              placeholder="Nissan"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="modelo" className="text-sm">
              Modelo *
            </Label>
            <Input
              id="modelo"
              name="modelo"
              required
              defaultValue={defaults?.modelo ?? ""}
              placeholder="NP300"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="anio" className="text-sm">
              Año
            </Label>
            <Input
              id="anio"
              name="anio"
              type="number"
              min="1980"
              max="2100"
              defaultValue={defaults?.anio ?? ""}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="color" className="text-sm">
              Color
            </Label>
            <Input
              id="color"
              name="color"
              defaultValue={defaults?.color ?? ""}
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
              defaultValue={defaults?.tipo ?? ""}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">—</option>
              <option value="pickup">Pickup</option>
              <option value="sedan">Sedán</option>
              <option value="suv">SUV</option>
              <option value="van">Van</option>
              <option value="camion">Camión</option>
              <option value="motocicleta">Motocicleta</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <Label htmlFor="combustible" className="text-sm">
              Combustible
            </Label>
            <select
              id="combustible"
              name="combustible"
              defaultValue={defaults?.combustible ?? ""}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">—</option>
              <option value="gasolina">Gasolina</option>
              <option value="diesel">Diesel</option>
              <option value="electrico">Eléctrico</option>
              <option value="hibrido">Híbrido</option>
              <option value="gas_lp">Gas LP</option>
            </select>
          </div>
          <div className="col-span-3">
            <Label htmlFor="uso" className="text-sm">
              Uso
            </Label>
            <Input
              id="uso"
              name="uso"
              defaultValue={defaults?.uso ?? ""}
              placeholder="Operativo, ejecutivo, transporte personal, ruta CIAE…"
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Propiedad</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="tipo_propiedad" className="text-sm">
              Tipo *
            </Label>
            <select
              id="tipo_propiedad"
              name="tipo_propiedad"
              required
              defaultValue={defaults?.tipo_propiedad ?? "propio"}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="propio">Propio</option>
              <option value="arrendamiento_financiero">
                Arrendamiento financiero
              </option>
              <option value="arrendamiento_puro">Arrendamiento puro</option>
              <option value="rentado_corto_plazo">Renta corto plazo</option>
              <option value="comodato">Comodato</option>
            </select>
          </div>
          <div>
            <Label htmlFor="fecha_adquisicion" className="text-sm">
              Fecha adquisición / inicio
            </Label>
            <Input
              id="fecha_adquisicion"
              name="fecha_adquisicion"
              type="date"
              defaultValue={defaults?.fecha_adquisicion ?? ""}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="costo_adquisicion" className="text-sm">
              Costo / Valor
            </Label>
            <Input
              id="costo_adquisicion"
              name="costo_adquisicion"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults?.costo_adquisicion ?? ""}
              className="mt-1 tnum"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="gasto_recurrente_id" className="text-sm">
              Vincular con gasto recurrente (mensualidad)
            </Label>
            <select
              id="gasto_recurrente_id"
              name="gasto_recurrente_id"
              defaultValue={defaults?.gasto_recurrente_id ?? ""}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Sin vincular —</option>
              {gastosRecurrentes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.descripcion} · ${(g.monto ?? 0).toLocaleString("es-MX")}/mes
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="fecha_termino_contrato" className="text-sm">
              Vencimiento contrato
            </Label>
            <Input
              id="fecha_termino_contrato"
              name="fecha_termino_contrato"
              type="date"
              defaultValue={defaults?.fecha_termino_contrato ?? ""}
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Estado y seguro</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="estatus" className="text-sm">
              Estatus *
            </Label>
            <select
              id="estatus"
              name="estatus"
              required
              defaultValue={defaults?.estatus ?? "activo"}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="activo">Activo</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="reparacion">En reparación</option>
              <option value="fuera_servicio">Fuera de servicio</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div>
            <Label htmlFor="km_actual" className="text-sm">
              Kilómetros actuales
            </Label>
            <Input
              id="km_actual"
              name="km_actual"
              type="number"
              min="0"
              defaultValue={defaults?.km_actual ?? 0}
              className="mt-1 tnum"
            />
          </div>
          <div>
            <Label htmlFor="poliza_seguro" className="text-sm">
              Póliza seguro
            </Label>
            <Input
              id="poliza_seguro"
              name="poliza_seguro"
              defaultValue={defaults?.poliza_seguro ?? ""}
              placeholder="Núm. póliza"
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="fecha_vencimiento_seguro" className="text-sm">
              Vencimiento seguro
            </Label>
            <Input
              id="fecha_vencimiento_seguro"
              name="fecha_vencimiento_seguro"
              type="date"
              defaultValue={defaults?.fecha_vencimiento_seguro ?? ""}
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Asignación</h2>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Empleado responsable. Se usa para imputar el costo de gasolina y
          mantenimiento en su perfil. Si el vehículo es de pool, déjalo vacío
          y captura el empleado en cada carga.
        </p>
        <div className="mt-3">
          <Label className="text-sm">Empleado asignado</Label>
          {empresaSel ? (
            <div className="mt-1">
              <EmpleadoPicker
                empleados={empleados.map((e) => ({
                  id: e.id,
                  nombre_completo: e.nombre_completo,
                  numero_empleado:
                    (e as { numero_empleado?: string }).numero_empleado ??
                    "",
                  puesto: e.puesto ?? null,
                  empresa_id: e.empresa_id,
                }))}
                value={empleadoIdSel}
                onChange={setEmpleadoIdSel}
                empresaId={empresaSel}
                filtroEmpresaId={empresaSel}
                required={false}
              />
            </div>
          ) : (
            <p className="mt-1 text-[11.5px] text-amber-700">
              Selecciona primero la empresa para asignar empleado.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Observaciones</h2>
        <textarea
          name="observaciones"
          rows={3}
          defaultValue={defaults?.observaciones ?? ""}
          placeholder="Detalles adicionales del vehículo, condición especial, asignación, etc."
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </section>

      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
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
        <SubmitBtn edit={Boolean(vehiculoId)} />
      </div>
    </form>
    </>
  );
}

function SubmitBtn({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (edit ? "Guardando…" : "Creando…") : edit ? "Guardar" : "Crear vehículo"}
    </Button>
  );
}
