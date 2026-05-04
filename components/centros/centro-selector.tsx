"use client";

import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";

import type { CentroOpcion } from "@/lib/centros/listar";

type Props = {
  /** ID del campo (también nombre del input). */
  id: string;
  /** Etiqueta visible. */
  label: string;
  /** ID de la empresa para filtrar. Si no, muestra todos. */
  empresaId?: string;
  /** Solo subtipo o tipo determinado (ej. solo CU para CFDI emitido). */
  filtroTipo?: "costo" | "utilidad";
  /** Default para sugerencia (ej. centro_default_gastos_id de la empresa). */
  defaultValue?: string | null;
  /** Lista completa de centros (caller obtiene con listarCentrosActivos). */
  centros: CentroOpcion[];
  /** Si TRUE muestra warning visual cuando vacío. */
  warnVacio?: boolean;
  /** Texto opcional debajo del select. */
  hint?: string;
  /** Si TRUE el campo es obligatorio. */
  required?: boolean;
};

export function CentroSelector({
  id,
  label,
  empresaId,
  filtroTipo,
  defaultValue,
  centros,
  warnVacio = true,
  hint,
  required = false,
}: Props) {
  const [valor, setValor] = useState<string>(defaultValue ?? "");

  const opciones = useMemo(() => {
    return centros.filter((c) => {
      if (empresaId && c.empresa_id !== empresaId) return false;
      if (filtroTipo && c.tipo !== filtroTipo) return false;
      return true;
    });
  }, [centros, empresaId, filtroTipo]);

  const vacio = !valor;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {!required && (
          <span className="ml-1 text-xs text-muted-foreground">
            (opcional)
          </span>
        )}
      </Label>
      <select
        id={id}
        name={id}
        required={required}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">— sin asignar —</option>
        {opciones.map((c) => (
          <option key={c.id} value={c.id}>
            {c.codigo} — {c.nombre}
          </option>
        ))}
      </select>
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {vacio && warnVacio && (
        <p className="text-xs text-amber-700">
          ⚠ Sin centro asignado: este movimiento no aparecerá en reportes por centro.
        </p>
      )}
      {opciones.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No hay centros activos para esta empresa.{" "}
          <a
            href="/configuracion/centros"
            className="text-primary hover:underline"
          >
            Crear uno
          </a>
        </p>
      )}
    </div>
  );
}
