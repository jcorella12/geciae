"use client";

import { Plus, Search, Truck } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { crearProveedorRapido } from "@/app/(app)/finanzas/proveedores/actions";

export type ProveedorPickerOption = {
  id: string;
  razon_social: string;
  rfc: string;
  nombre_comercial: string | null;
};

export function ProveedorPicker({
  proveedores: iniciales,
  value,
  onChange,
  empresaId,
  inputName = "proveedor_id",
  required = true,
}: {
  proveedores: ProveedorPickerOption[];
  value: string;
  onChange: (id: string) => void;
  empresaId?: string | null;
  inputName?: string;
  required?: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [proveedores, setProveedores] = useState(iniciales);
  const [showInline, setShowInline] = useState(false);
  const [razonSocial, setRazonSocial] = useState("");
  const [rfc, setRfc] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? proveedores.filter(
        (p) =>
          p.razon_social.toLowerCase().includes(q) ||
          p.rfc.toLowerCase().includes(q) ||
          (p.nombre_comercial ?? "").toLowerCase().includes(q),
      )
    : proveedores;

  const seleccionado = proveedores.find((p) => p.id === value);

  const onAbrirInline = () => {
    if (busqueda.trim() && !/^[a-z0-9]{12,}$/i.test(busqueda.trim())) {
      setRazonSocial(busqueda.trim());
    }
    setShowInline(true);
  };

  const onCrearInline = (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await crearProveedorRapido({
        razon_social: razonSocial,
        rfc,
        nombre_comercial: nombreComercial || null,
        empresa_id: empresaId ?? null,
      });
      if (!r.ok || !r.proveedor) {
        setError(r.error ?? "Error al crear");
        return;
      }
      const nuevo: ProveedorPickerOption = {
        id: r.proveedor.id,
        razon_social: r.proveedor.razon_social,
        rfc: r.proveedor.rfc,
        nombre_comercial: r.proveedor.nombre_comercial,
      };
      setProveedores((prev) =>
        prev.some((p) => p.id === nuevo.id) ? prev : [nuevo, ...prev],
      );
      onChange(nuevo.id);
      setShowInline(false);
      setRazonSocial("");
      setRfc("");
      setNombreComercial("");
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
          placeholder="Buscar proveedor por razón social, RFC o nombre comercial…"
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
            <span className="flex-1 truncate">{p.razon_social}</span>
            <code className="font-mono text-[10.5px] text-ink-3">{p.rfc}</code>
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
                : "Sin proveedores registrados aún."}
            </p>
            <button
              type="button"
              onClick={onAbrirInline}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-brand bg-brand-soft px-3 py-1 text-[11.5px] font-medium text-brand-deep hover:bg-brand hover:text-brand-fg"
            >
              <Truck className="h-3 w-3" />
              Crear proveedor nuevo
            </button>
          </div>
        )}
      </div>

      {seleccionado && (
        <p className="mt-1 text-xs text-ink-3">
          Seleccionado: <strong>{seleccionado.razon_social}</strong> ·{" "}
          <code className="font-mono">{seleccionado.rfc}</code>
        </p>
      )}

      {!showInline && filtrados.length > 0 && (
        <button
          type="button"
          onClick={onAbrirInline}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-brand hover:text-brand-deep"
        >
          <Plus className="h-3 w-3" />
          ¿No está? Crear proveedor nuevo aquí mismo
        </button>
      )}

      {showInline && (
        <div className="mt-3 rounded-md border border-brand/40 bg-brand-soft/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[12.5px] font-semibold text-brand-deep">
              Nuevo proveedor (rápido)
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
            Solo lo esencial. Completa el resto (régimen, REPSE, dirección)
            después en Proveedores.
          </p>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 md:col-span-7">
              <Label htmlFor="qp_razon" className="text-[11px]">
                Razón social *
              </Label>
              <Input
                id="qp_razon"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                placeholder="PROVEEDOR SA DE CV"
                className="mt-0.5 text-sm"
              />
            </div>
            <div className="col-span-12 md:col-span-5">
              <Label htmlFor="qp_rfc" className="text-[11px]">
                RFC *
              </Label>
              <Input
                id="qp_rfc"
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                placeholder="PRO010101AB1"
                maxLength={13}
                className="mt-0.5 font-mono text-sm"
              />
            </div>
            <div className="col-span-12">
              <Label htmlFor="qp_nc" className="text-[11px]">
                Nombre comercial (opcional)
              </Label>
              <Input
                id="qp_nc"
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                placeholder="Marca / nombre conocido"
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
                pending ||
                razonSocial.trim().length < 3 ||
                rfc.trim().length < 12
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
