"use client";

import { FolderPlus, Plus, Search } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { crearProyectoRapido } from "@/app/(app)/proyectos/actions";

export type ProyectoPickerOption = {
  id: string;
  codigo: string;
  nombre: string;
  empresa_id: string;
  cliente_id: string | null;
  estado: string | null;
};

/**
 * S3-T3 — Picker de proyecto con creación inline (quick-create).
 *
 * Renderiza hidden input name=proyecto_id. Si el proyecto no existe,
 * abre mini-form: nombre + cliente_id (obligatorios). El código se
 * autogenera (`empresa-año-NNN`).
 */
export function ProyectoPicker({
  proyectos: proyectosIniciales,
  clientes,
  value,
  onChange,
  empresaId,
  inputName = "proyecto_id",
  required = false,
  filtroEmpresaId,
  filtroClienteId,
}: {
  proyectos: ProyectoPickerOption[];
  /** Clientes disponibles para crear proyecto nuevo */
  clientes: { id: string; razon_social: string; rfc: string | null }[];
  value: string;
  onChange: (id: string) => void;
  empresaId: string | null;
  inputName?: string;
  required?: boolean;
  filtroEmpresaId?: string | null;
  filtroClienteId?: string | null;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [proyectos, setProyectos] = useState(proyectosIniciales);
  const [showInline, setShowInline] = useState(false);
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState(filtroClienteId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  let scope = proyectos;
  if (filtroEmpresaId)
    scope = scope.filter((p) => p.empresa_id === filtroEmpresaId);
  if (filtroClienteId)
    scope = scope.filter((p) => p.cliente_id === filtroClienteId);

  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? scope.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.codigo.toLowerCase().includes(q),
      )
    : scope;

  const seleccionado = proyectos.find((p) => p.id === value);

  const onAbrirInline = () => {
    if (busqueda.trim()) setNombre(busqueda.trim());
    if (filtroClienteId) setClienteId(filtroClienteId);
    setShowInline(true);
  };

  const onCrearInline = (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    if (!empresaId) {
      setError("Selecciona empresa antes de crear proyecto.");
      return;
    }
    if (!clienteId) {
      setError("Selecciona un cliente para el nuevo proyecto.");
      return;
    }
    startTransition(async () => {
      const r = await crearProyectoRapido({
        nombre,
        empresa_id: empresaId,
        cliente_id: clienteId,
      });
      if (!r.ok || !r.proyecto) {
        setError(r.error ?? "Error al crear");
        return;
      }
      const nuevo: ProyectoPickerOption = {
        id: r.proyecto.id,
        codigo: r.proyecto.codigo,
        nombre: r.proyecto.nombre,
        empresa_id: r.proyecto.empresa_id,
        cliente_id: r.proyecto.cliente_id,
        estado: "cotizacion",
      };
      setProyectos((prev) => {
        if (prev.some((x) => x.id === nuevo.id)) return prev;
        return [nuevo, ...prev];
      });
      onChange(nuevo.id);
      setShowInline(false);
      setNombre("");
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
          placeholder="Buscar proyecto por código o nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      <div className="mt-1 max-h-44 overflow-y-auto rounded-md border border-border bg-background">
        {filtrados.slice(0, 30).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={`flex w-full items-center gap-2 border-b border-border/60 px-3 py-1.5 text-left text-sm last:border-b-0 hover:bg-secondary/40 ${
              value === p.id ? "bg-secondary/60" : ""
            }`}
          >
            <code className="shrink-0 font-mono text-[11px] text-ink-3">
              {p.codigo}
            </code>
            <span className="flex-1 truncate">{p.nombre}</span>
            {value === p.id && (
              <span className="text-[10px] font-semibold text-brand">✓</span>
            )}
          </button>
        ))}
        {filtrados.length === 0 && (
          <div className="px-3 py-3 text-center">
            <p className="text-xs text-ink-3">
              {q
                ? `Sin resultados para "${busqueda}"`
                : "Sin proyectos disponibles."}
            </p>
            <button
              type="button"
              onClick={onAbrirInline}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-brand bg-brand-soft px-3 py-1 text-[11.5px] font-medium text-brand-deep hover:bg-brand hover:text-brand-fg"
            >
              <FolderPlus className="h-3 w-3" />
              Crear proyecto nuevo
            </button>
          </div>
        )}
      </div>

      {seleccionado && (
        <p className="mt-1 text-xs text-ink-3">
          Seleccionado: <code className="font-mono">{seleccionado.codigo}</code> ·{" "}
          <strong>{seleccionado.nombre}</strong>
        </p>
      )}

      {!showInline && filtrados.length > 0 && (
        <button
          type="button"
          onClick={onAbrirInline}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-brand hover:text-brand-deep"
        >
          <Plus className="h-3 w-3" />
          ¿No está? Crear proyecto nuevo aquí
        </button>
      )}

      {showInline && (
        <div className="mt-3 rounded-md border border-brand/40 bg-brand-soft/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[12.5px] font-semibold text-brand-deep">
              Nuevo proyecto (rápido)
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
            Solo nombre + cliente. El código se genera automáticamente. El
            resto (fechas, presupuesto, equipo) lo configuras en la ficha
            del proyecto después.
          </p>
          <div className="space-y-2">
            <div>
              <Label htmlFor="qc_pry_nombre" className="text-[11px]">
                Nombre del proyecto *
              </Label>
              <Input
                id="qc_pry_nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Instalación solar Cliente XYZ"
                className="mt-0.5 text-sm"
              />
            </div>
            {!filtroClienteId && (
              <div>
                <Label htmlFor="qc_pry_cliente" className="text-[11px]">
                  Cliente *
                </Label>
                <select
                  id="qc_pry_cliente"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="mt-0.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  <option value="">— Selecciona cliente —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razon_social}
                      {c.rfc ? ` · ${c.rfc}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                pending || nombre.trim().length < 3 || !clienteId
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
