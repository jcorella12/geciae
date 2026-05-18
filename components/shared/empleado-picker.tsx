"use client";

import { Plus, Search, UserPlus2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { crearEmpleadoRapido } from "@/app/(app)/personas/actions";

export type EmpleadoPickerOption = {
  id: string;
  nombre_completo: string;
  numero_empleado: string;
  puesto: string | null;
  empresa_id: string;
};

/**
 * S3-T3 — Picker de empleado con creación inline (quick-create).
 *
 * Renderiza un hidden input con name=empleado_id (configurable) y un
 * buscador con la lista filtrada. Si el empleado no existe, abre
 * mini-form para crearlo (nombre, puesto) — CURP/RFC se completan
 * después en la ficha del empleado.
 */
export function EmpleadoPicker({
  empleados: empleadosIniciales,
  value,
  onChange,
  empresaId,
  inputName = "empleado_id",
  required = false,
  /** Si se setea, el picker filtra a empleados de esa empresa (útil
   *  cuando el form está bound a una empresa específica). */
  filtroEmpresaId,
}: {
  empleados: EmpleadoPickerOption[];
  value: string;
  onChange: (id: string) => void;
  empresaId: string | null;
  inputName?: string;
  required?: boolean;
  filtroEmpresaId?: string | null;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [empleados, setEmpleados] = useState(empleadosIniciales);
  const [showInline, setShowInline] = useState(false);
  const [nombre, setNombre] = useState("");
  const [puesto, setPuesto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const scope = filtroEmpresaId
    ? empleados.filter((e) => e.empresa_id === filtroEmpresaId)
    : empleados;

  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? scope.filter(
        (e) =>
          e.nombre_completo.toLowerCase().includes(q) ||
          e.numero_empleado.toLowerCase().includes(q) ||
          (e.puesto ?? "").toLowerCase().includes(q),
      )
    : scope;

  const seleccionado = empleados.find((e) => e.id === value);

  const onAbrirInline = () => {
    if (busqueda.trim()) setNombre(busqueda.trim());
    setShowInline(true);
  };

  const onCrearInline = (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    if (!empresaId) {
      setError("Selecciona empresa antes de crear empleado.");
      return;
    }
    startTransition(async () => {
      const r = await crearEmpleadoRapido({
        nombre_completo: nombre,
        puesto,
        empresa_id: empresaId,
      });
      if (!r.ok || !r.empleado) {
        setError(r.error ?? "Error al crear");
        return;
      }
      const nuevo: EmpleadoPickerOption = {
        id: r.empleado.id,
        nombre_completo: r.empleado.nombre_completo,
        numero_empleado: r.empleado.numero_empleado,
        puesto: r.empleado.puesto,
        empresa_id: r.empleado.empresa_id,
      };
      setEmpleados((prev) => {
        if (prev.some((x) => x.id === nuevo.id)) return prev;
        return [nuevo, ...prev];
      });
      onChange(nuevo.id);
      setShowInline(false);
      setNombre("");
      setPuesto("");
      setBusqueda("");
    });
  };

  return (
    <div>
      <input
        type="hidden"
        name={inputName}
        value={value}
        required={required}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
        <Input
          type="text"
          placeholder="Buscar empleado por nombre, número o puesto…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      <div className="mt-1 max-h-44 overflow-y-auto rounded-md border border-border bg-background">
        {filtrados.slice(0, 30).map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onChange(e.id)}
            className={`flex w-full items-center gap-2 border-b border-border/60 px-3 py-1.5 text-left text-sm last:border-b-0 hover:bg-secondary/40 ${
              value === e.id ? "bg-secondary/60" : ""
            }`}
          >
            <span className="flex-1 truncate">{e.nombre_completo}</span>
            <code className="font-mono text-[10.5px] text-ink-3">
              {e.numero_empleado}
            </code>
            {e.puesto && (
              <span className="hidden truncate text-[10.5px] text-ink-3 sm:inline">
                {e.puesto}
              </span>
            )}
            {value === e.id && (
              <span className="text-[10px] font-semibold text-brand">✓</span>
            )}
          </button>
        ))}
        {filtrados.length === 0 && (
          <div className="px-3 py-3 text-center">
            <p className="text-xs text-ink-3">
              {q
                ? `Sin resultados para "${busqueda}"`
                : "Sin empleados disponibles."}
            </p>
            <button
              type="button"
              onClick={onAbrirInline}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-brand bg-brand-soft px-3 py-1 text-[11.5px] font-medium text-brand-deep hover:bg-brand hover:text-brand-fg"
            >
              <UserPlus2 className="h-3 w-3" />
              Crear empleado nuevo
            </button>
          </div>
        )}
      </div>

      {seleccionado && (
        <p className="mt-1 text-xs text-ink-3">
          Seleccionado: <strong>{seleccionado.nombre_completo}</strong>
          {seleccionado.puesto && ` · ${seleccionado.puesto}`}
        </p>
      )}

      {!showInline && filtrados.length > 0 && (
        <button
          type="button"
          onClick={onAbrirInline}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-brand hover:text-brand-deep"
        >
          <Plus className="h-3 w-3" />
          ¿No está? Crear empleado nuevo aquí
        </button>
      )}

      {showInline && (
        <div className="mt-3 rounded-md border border-brand/40 bg-brand-soft/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[12.5px] font-semibold text-brand-deep">
              Nuevo empleado (rápido)
            </h4>
            <button
              type="button"
              onClick={() => setShowInline(false)}
              className="text-[11px] text-ink-3 hover:text-ink-1"
            >
              Cancelar
            </button>
          </div>
          <p className="mb-2 text-[11px] text-ink-3">
            Solo lo mínimo. CURP, RFC, NSS, salario y demás datos se
            completan en la ficha del empleado después.
          </p>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 md:col-span-7">
              <Label htmlFor="qc_emp_nombre" className="text-[11px]">
                Nombre completo *
              </Label>
              <Input
                id="qc_emp_nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="JUAN PÉREZ LÓPEZ"
                className="mt-0.5 text-sm"
              />
            </div>
            <div className="col-span-12 md:col-span-5">
              <Label htmlFor="qc_emp_puesto" className="text-[11px]">
                Puesto *
              </Label>
              <Input
                id="qc_emp_puesto"
                value={puesto}
                onChange={(e) => setPuesto(e.target.value)}
                placeholder="Técnico solar"
                className="mt-0.5 text-sm"
              />
            </div>
          </div>
          {error && (
            <p className="mt-2 text-[11px] text-destructive">{error}</p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onCrearInline}
              disabled={
                pending || nombre.trim().length < 3 || puesto.trim().length < 2
              }
            >
              {pending ? "Creando…" : "Crear y seleccionar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
