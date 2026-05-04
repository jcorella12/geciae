"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { CentroSelector } from "@/components/centros/centro-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { CentroOpcion } from "@/lib/centros/listar";
import { initialGastoState } from "@/lib/gastos-recurrentes/state";

import {
  actualizarGastoRecurrente,
  crearGastoRecurrente,
} from "./actions";

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

type Proveedor = {
  id: string;
  razon_social: string;
  rfc: string;
};

type Defaults = {
  empresa_id?: string;
  categoria?: string;
  descripcion?: string;
  proveedor_id?: string | null;
  proveedor_nombre?: string | null;
  monto?: number;
  moneda?: string;
  iva_incluido?: boolean;
  frecuencia?: string;
  dia_pago?: number | null;
  fecha_inicio?: string;
  fecha_fin?: string | null;
  identificador?: string | null;
  observaciones?: string | null;
  centro_id?: string | null;
};

const CATEGORIAS = [
  { v: "arrendamiento_vehiculo", l: "🚗 Arrendamiento vehículo" },
  { v: "renta_inmueble", l: "🏢 Renta inmueble" },
  { v: "telefonia_internet", l: "📞 Telefonía / Internet" },
  { v: "software_saas", l: "💻 Software / SaaS" },
  { v: "seguros", l: "🛡 Seguros" },
  { v: "vigilancia", l: "👁 Vigilancia" },
  { v: "mantenimiento", l: "🔧 Mantenimiento" },
  { v: "limpieza", l: "🧹 Limpieza" },
  { v: "servicios_publicos", l: "💡 Servicios públicos" },
  { v: "membresia_camara", l: "🏛 Membresía / Cámara" },
  { v: "asesoria_contable", l: "📊 Asesoría contable" },
  { v: "asesoria_legal", l: "⚖️ Asesoría legal" },
  { v: "otros_indirectos", l: "📋 Otros indirectos" },
];

export function GastoForm({
  empresas,
  proveedores,
  centros,
  centroDefaultPorEmpresa,
  gastoId,
  defaults,
}: {
  empresas: Empresa[];
  proveedores: Proveedor[];
  centros: CentroOpcion[];
  centroDefaultPorEmpresa: Record<string, string | null>;
  gastoId?: string;
  defaults?: Defaults;
}) {
  const router = useRouter();
  const action = gastoId
    ? actualizarGastoRecurrente.bind(null, gastoId)
    : crearGastoRecurrente;
  const [state, formAction] = useFormState(action, initialGastoState);
  const [empresaId, setEmpresaId] = useState<string>(
    defaults?.empresa_id ?? "",
  );

  useEffect(() => {
    if (state.ok) {
      router.push("/finanzas/gastos-recurrentes");
    }
  }, [state.ok, router]);

  const today = new Date().toISOString().slice(0, 10);
  const centroDefault =
    defaults?.centro_id ??
    (empresaId ? centroDefaultPorEmpresa[empresaId] ?? null : null);

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Información básica</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="empresa_id" className="text-sm">
              Empresa *
            </Label>
            <select
              id="empresa_id"
              name="empresa_id"
              required
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
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
            <Label htmlFor="categoria" className="text-sm">
              Categoría *
            </Label>
            <select
              id="categoria"
              name="categoria"
              required
              defaultValue={defaults?.categoria ?? ""}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Selecciona —</option>
              {CATEGORIAS.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.l}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="descripcion" className="text-sm">
              Descripción *
            </Label>
            <Input
              id="descripcion"
              name="descripcion"
              required
              defaultValue={defaults?.descripcion ?? ""}
              placeholder="Ej: Tsuru 2024 — placa SON123, ruta Hermosillo"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="identificador" className="text-sm">
              Identificador (placa, contrato, ID)
            </Label>
            <Input
              id="identificador"
              name="identificador"
              defaultValue={defaults?.identificador ?? ""}
              placeholder="SON-12345 / Contrato-2024-007"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="proveedor_id" className="text-sm">
              Proveedor (catálogo)
            </Label>
            <select
              id="proveedor_id"
              name="proveedor_id"
              defaultValue={defaults?.proveedor_id ?? ""}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Sin vincular —</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.razon_social} ({p.rfc})
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="proveedor_nombre" className="text-sm">
              Proveedor (nombre libre, si no está en catálogo)
            </Label>
            <Input
              id="proveedor_nombre"
              name="proveedor_nombre"
              defaultValue={defaults?.proveedor_nombre ?? ""}
              placeholder="Arrendadora Sonora SA — solo si no quieres registrarlo en proveedores"
              className="mt-1"
            />
          </div>
          <div className="col-span-2">
            <CentroSelector
              id="centro_id"
              label="Centro de costo"
              empresaId={empresaId || undefined}
              filtroTipo="costo"
              defaultValue={centroDefault}
              centros={centros}
              hint="Centro al que se cargará el gasto. Sugerido: centro_default de la empresa."
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Monto y frecuencia</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="monto" className="text-sm">
              Monto *
            </Label>
            <Input
              id="monto"
              name="monto"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={defaults?.monto ?? ""}
              className="mt-1 tnum"
            />
          </div>
          <div>
            <Label htmlFor="moneda" className="text-sm">
              Moneda
            </Label>
            <select
              id="moneda"
              name="moneda"
              defaultValue={defaults?.moneda ?? "MXN"}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="iva_incluido"
                value="true"
                defaultChecked={defaults?.iva_incluido ?? true}
                className="rounded"
              />
              Monto incluye IVA
            </label>
          </div>
          <div>
            <Label htmlFor="frecuencia" className="text-sm">
              Frecuencia *
            </Label>
            <select
              id="frecuencia"
              name="frecuencia"
              required
              defaultValue={defaults?.frecuencia ?? "mensual"}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="mensual">Mensual</option>
              <option value="bimestral">Bimestral</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>
          <div>
            <Label htmlFor="dia_pago" className="text-sm">
              Día de pago (1-31)
            </Label>
            <Input
              id="dia_pago"
              name="dia_pago"
              type="number"
              min="1"
              max="31"
              defaultValue={defaults?.dia_pago ?? ""}
              placeholder="ej. 5"
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Vigencia</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="fecha_inicio" className="text-sm">
              Fecha inicio *
            </Label>
            <Input
              id="fecha_inicio"
              name="fecha_inicio"
              type="date"
              required
              defaultValue={defaults?.fecha_inicio ?? today}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="fecha_fin" className="text-sm">
              Fecha fin (opcional, vacío = indefinido)
            </Label>
            <Input
              id="fecha_fin"
              name="fecha_fin"
              type="date"
              defaultValue={defaults?.fecha_fin ?? ""}
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Observaciones</h2>
        <textarea
          name="observaciones"
          rows={4}
          defaultValue={defaults?.observaciones ?? ""}
          placeholder="Cláusulas relevantes, condiciones especiales, ajustes anuales, etc."
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
        <SubmitBtn edit={Boolean(gastoId)} />
      </div>
    </form>
  );
}

function SubmitBtn({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (edit ? "Guardando…" : "Creando…") : edit ? "Guardar" : "Crear"}
    </Button>
  );
}
