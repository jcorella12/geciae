"use client";

import { Plus, Search, UserPlus2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { crearClienteRapido } from "@/app/(app)/clientes/actions";

export type ClientePickerOption = {
  id: string;
  razon_social: string;
  rfc: string | null;
  nombre_comercial: string | null;
};

/**
 * Componente reutilizable: búsqueda de cliente con creación inline.
 * El value es el cliente_id seleccionado. Renderiza un hidden input con name=cliente_id.
 */
export function ClientePicker({
  clientes: clientesIniciales,
  value,
  onChange,
  empresaId,
  inputName = "cliente_id",
  required = true,
}: {
  clientes: ClientePickerOption[];
  value: string;
  onChange: (id: string) => void;
  empresaId?: string | null;
  inputName?: string;
  required?: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState(clientesIniciales);
  const [showInline, setShowInline] = useState(false);

  // Form fields para crear inline
  const [razonSocial, setRazonSocial] = useState("");
  const [rfc, setRfc] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? clientes.filter(
        (c) =>
          c.razon_social.toLowerCase().includes(q) ||
          (c.rfc ?? "").toLowerCase().includes(q) ||
          (c.nombre_comercial ?? "").toLowerCase().includes(q),
      )
    : clientes;

  const seleccionado = clientes.find((c) => c.id === value);

  const onAbrirInline = () => {
    // Pre-llenar razón social con la búsqueda actual si parece nombre
    if (busqueda.trim() && !/^[a-z0-9]{12,}$/i.test(busqueda.trim())) {
      setRazonSocial(busqueda.trim());
    }
    setShowInline(true);
  };

  const onCrearInline = (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await crearClienteRapido({
        razon_social: razonSocial,
        rfc,
        nombre_comercial: nombreComercial || null,
        email: email || null,
        empresa_id: empresaId ?? null,
      });
      if (!r.ok || !r.cliente) {
        setError(r.error ?? "Error al crear");
        return;
      }
      // Agregar a la lista local y seleccionar
      const nuevo: ClientePickerOption = {
        id: r.cliente.id,
        razon_social: r.cliente.razon_social,
        rfc: r.cliente.rfc,
        nombre_comercial: r.cliente.nombre_comercial,
      };
      setClientes((prev) => {
        if (prev.some((c) => c.id === nuevo.id)) return prev;
        return [nuevo, ...prev];
      });
      onChange(nuevo.id);
      setShowInline(false);
      setRazonSocial("");
      setRfc("");
      setNombreComercial("");
      setEmail("");
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

      {/* Buscador */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
        <Input
          type="text"
          placeholder="Buscar cliente por razón social, RFC o nombre comercial…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      {/* Lista de coincidencias */}
      <div className="mt-1 max-h-44 overflow-y-auto rounded-md border border-border bg-background">
        {filtrados.slice(0, 30).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={`flex w-full items-center gap-2 border-b border-border/60 px-3 py-1.5 text-left text-sm last:border-b-0 hover:bg-secondary/40 ${
              value === c.id ? "bg-secondary/60" : ""
            }`}
          >
            <span className="flex-1 truncate">{c.razon_social}</span>
            <code className="font-mono text-[10.5px] text-ink-3">{c.rfc}</code>
            {value === c.id && (
              <span className="text-[10px] font-semibold text-brand">✓</span>
            )}
          </button>
        ))}
        {filtrados.length === 0 && (
          <div className="px-3 py-3 text-center">
            <p className="text-xs text-ink-3">
              {q
                ? `Sin resultados para "${busqueda}"`
                : "Sin clientes registrados aún."}
            </p>
            <button
              type="button"
              onClick={onAbrirInline}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-brand bg-brand-soft px-3 py-1 text-[11.5px] font-medium text-brand-deep hover:bg-brand hover:text-brand-fg"
            >
              <UserPlus2 className="h-3 w-3" />
              Crear cliente nuevo
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

      {/* Botón "Crear cliente" siempre disponible (no solo cuando no hay results) */}
      {!showInline && filtrados.length > 0 && (
        <button
          type="button"
          onClick={onAbrirInline}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-brand hover:text-brand-deep"
        >
          <Plus className="h-3 w-3" />
          ¿No está? Crear cliente nuevo aquí mismo
        </button>
      )}

      {/* Form inline */}
      {showInline && (
        <div className="mt-3 rounded-md border border-brand/40 bg-brand-soft/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[12.5px] font-semibold text-brand-deep">
              Nuevo cliente (rápido)
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
            Solo lo esencial. Podrás completar dirección, régimen fiscal y otros
            datos después en el módulo de Clientes.
          </p>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 md:col-span-7">
              <Label htmlFor="qc_razon" className="text-[11px]">
                Razón social *
              </Label>
              <Input
                id="qc_razon"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                placeholder="GRUPO ACME SA DE CV"
                className="mt-0.5 text-sm"
              />
            </div>
            <div className="col-span-12 md:col-span-5">
              <Label htmlFor="qc_rfc" className="text-[11px]">
                RFC *
              </Label>
              <Input
                id="qc_rfc"
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                placeholder="ACM010101AB1"
                maxLength={13}
                className="mt-0.5 font-mono text-sm"
              />
            </div>
            <div className="col-span-12 md:col-span-7">
              <Label htmlFor="qc_nc" className="text-[11px]">
                Nombre comercial (opcional)
              </Label>
              <Input
                id="qc_nc"
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                placeholder="ACME"
                className="mt-0.5 text-sm"
              />
            </div>
            <div className="col-span-12 md:col-span-5">
              <Label htmlFor="qc_email" className="text-[11px]">
                Email facturación (opcional)
              </Label>
              <Input
                id="qc_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="facturas@empresa.com"
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
              disabled={pending || razonSocial.trim().length < 3 || rfc.trim().length < 12}
            >
              {pending ? "Creando…" : "Crear y seleccionar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
