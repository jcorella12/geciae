"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { ClientePicker } from "@/components/shared/cliente-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ESTADOS_PROYECTO,
  initialProyectoState,
  TIPOS_PROYECTO,
  type ProyectoState,
} from "@/lib/proyectos/state";

import {
  createProyecto,
  sugerirCodigoProyecto,
  updateProyecto,
} from "./actions";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

type Cliente = {
  id: string;
  razon_social: string;
  rfc: string;
};

export type ProyectoFormDefaults = {
  empresa_id?: string;
  cliente_id?: string;
  codigo?: string;
  nombre?: string;
  descripcion?: string | null;
  tipo?: string | null;
  estado?: string;
  fecha_contrato?: string | null;
  fecha_inicio_planeado?: string | null;
  fecha_fin_planeado?: string | null;
  monto_contratado?: number | null;
  presupuesto_costo?: number | null;
  capacidad_kwp?: number | null;
  observaciones?: string | null;
};

type Props = {
  empresas: Empresa[];
  clientes: Cliente[];
  defaults?: ProyectoFormDefaults;
  proyectoId?: string;
};

export function ProyectoForm({
  empresas,
  clientes,
  defaults,
  proyectoId,
}: Props) {
  const action = proyectoId
    ? (
        prev: ProyectoState,
        fd: FormData,
      ): ReturnType<typeof updateProyecto> =>
        updateProyecto(proyectoId, prev, fd)
    : createProyecto;
  const [state, formAction] = useFormState(action, initialProyectoState);

  const [empresaId, setEmpresaId] = useState(defaults?.empresa_id ?? "");
  const [clienteId, setClienteId] = useState(defaults?.cliente_id ?? "");
  const [codigo, setCodigo] = useState(defaults?.codigo ?? "");
  const [tipo, setTipo] = useState(defaults?.tipo ?? "");

  // Auto-sugerir código al cambiar empresa (solo si no estamos editando y código vacío).
  useEffect(() => {
    if (proyectoId) return; // edit mode, no tocar
    if (!empresaId || codigo) return;
    const empresa = empresas.find((e) => e.id === empresaId);
    if (!empresa) return;
    void sugerirCodigoProyecto(empresa.codigo).then((sug) => {
      setCodigo(sug);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const esSolar = tipo?.startsWith("solar_") || tipo === "limpieza_solar" || tipo === "mantenimiento_solar";

  const fieldErr = (k: string) => state.fieldErrors?.[k]?.[0];

  if (empresas.length === 0) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-medium">Sin empresas donde puedas crear proyectos.</p>
        <p className="mt-1 text-muted-foreground">
          Necesitas rol CEO, Director u Operativo.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Empresa solicitante */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Empresa ejecutora</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Empresa del grupo responsable del proyecto.
        </p>
        <fieldset className="mt-4 grid grid-cols-2 gap-2">
          {empresas.map((e) => (
            <label
              key={e.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
            >
              <input
                type="radio"
                name="empresa_id"
                value={e.id}
                required
                checked={empresaId === e.id}
                onChange={() => setEmpresaId(e.id)}
                className="h-4 w-4"
              />
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
                }`}
              />
              <span className="truncate">
                {e.nombre_comercial ?? e.razon_social}
              </span>
            </label>
          ))}
        </fieldset>
        {fieldErr("empresa_id") && (
          <p className="mt-2 text-xs text-destructive">
            {fieldErr("empresa_id")}
          </p>
        )}
      </section>

      {/* Cliente */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Cliente</h2>
        <div className="mt-4">
          <ClientePicker
            clientes={clientes.map((c) => ({
              id: c.id,
              razon_social: c.razon_social,
              rfc: c.rfc,
              nombre_comercial: null,
            }))}
            value={clienteId}
            onChange={setClienteId}
            empresaId={empresaId}
          />
          {fieldErr("cliente_id") && (
            <p className="mt-1 text-xs text-destructive">
              {fieldErr("cliente_id")}
            </p>
          )}
        </div>
      </section>

      {/* Datos generales */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Datos del proyecto</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              name="codigo"
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="PSE-2026-001"
              className="font-mono"
            />
            {fieldErr("codigo") && (
              <p className="text-xs text-destructive">{fieldErr("codigo")}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="estado">Estado</Label>
            <select
              id="estado"
              name="estado"
              defaultValue={defaults?.estado ?? "cotizacion"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ESTADOS_PROYECTO.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="nombre">Nombre del proyecto</Label>
            <Input
              id="nombre"
              name="nombre"
              required
              defaultValue={defaults?.nombre ?? ""}
              placeholder="Sistema FV 250 kW Industrias del Norte"
            />
            {fieldErr("nombre") && (
              <p className="text-xs text-destructive">{fieldErr("nombre")}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="tipo">Tipo</Label>
            <select
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sin clasificar</option>
              {TIPOS_PROYECTO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {esSolar && (
            <div className="space-y-1">
              <Label htmlFor="capacidad_kwp">Capacidad (kWp)</Label>
              <Input
                id="capacidad_kwp"
                name="capacidad_kwp"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  defaults?.capacidad_kwp != null
                    ? String(defaults.capacidad_kwp)
                    : ""
                }
                placeholder="250"
              />
            </div>
          )}
        </div>
      </section>

      {/* Fechas y montos */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Fechas y montos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="fecha_contrato">Fecha de contrato</Label>
            <Input
              id="fecha_contrato"
              name="fecha_contrato"
              type="date"
              defaultValue={defaults?.fecha_contrato ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fecha_inicio_planeado">Inicio planeado</Label>
            <Input
              id="fecha_inicio_planeado"
              name="fecha_inicio_planeado"
              type="date"
              defaultValue={defaults?.fecha_inicio_planeado ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fecha_fin_planeado">Fin planeado</Label>
            <Input
              id="fecha_fin_planeado"
              name="fecha_fin_planeado"
              type="date"
              defaultValue={defaults?.fecha_fin_planeado ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="monto_contratado">Monto contratado (MXN)</Label>
            <Input
              id="monto_contratado"
              name="monto_contratado"
              type="number"
              min="0"
              step="0.01"
              defaultValue={
                defaults?.monto_contratado != null
                  ? String(defaults.monto_contratado)
                  : ""
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="presupuesto_costo">Presupuesto de costo (MXN)</Label>
            <Input
              id="presupuesto_costo"
              name="presupuesto_costo"
              type="number"
              min="0"
              step="0.01"
              defaultValue={
                defaults?.presupuesto_costo != null
                  ? String(defaults.presupuesto_costo)
                  : ""
              }
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <Label htmlFor="descripcion">Descripción</Label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={3}
          maxLength={2000}
          defaultValue={defaults?.descripcion ?? ""}
          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <Label htmlFor="observaciones" className="mt-4 block">
          Observaciones internas
        </Label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={3}
          maxLength={2000}
          defaultValue={defaults?.observaciones ?? ""}
          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </section>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitBtn mode={proyectoId ? "edit" : "create"} />
    </form>
  );
}

function SubmitBtn({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? mode === "create"
          ? "Creando…"
          : "Guardando…"
        : mode === "create"
          ? "Crear proyecto"
          : "Guardar cambios"}
    </Button>
  );
}
