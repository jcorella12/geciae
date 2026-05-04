"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { crearClientePotencial } from "@/app/(app)/clientes/actions";

export type ClientePotencialQuickItem = {
  id: string;
  razon_social: string;
  rfc: string | null;
  nombre_comercial: string | null;
  es_potencial: boolean;
};

const TIPOS = [
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "industrial", label: "Industrial" },
  { value: "gubernamental", label: "Gubernamental" },
] as const;

/**
 * Mini-form para crear un cliente potencial (sin RFC) desde el flujo de
 * oportunidad. Diseñado para vivir dentro del modal del QuickCreatePicker.
 *
 * Caso típico: el vendedor captura un lead residencial ("Casa Don Juan")
 * que aún no tiene RFC. Más adelante, al ganar la oportunidad, se invocará
 * `convertirClienteAFormal` para capturar los datos fiscales.
 */
export function QuickCreateClientePotencialForm({
  empresaId,
  initialNombre,
  onCreated,
  onCancel,
}: {
  empresaId?: string | null;
  initialNombre?: string;
  onCreated: (c: ClientePotencialQuickItem) => void;
  onCancel: () => void;
}) {
  const [razonSocial, setRazonSocial] = useState(initialNombre?.trim() ?? "");
  const [nombreComercial, setNombreComercial] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [tipo, setTipo] = useState<
    "residencial" | "comercial" | "industrial" | "gubernamental" | ""
  >("residencial");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await crearClientePotencial({
        razon_social: razonSocial,
        nombre_comercial: nombreComercial || null,
        telefono: telefono || null,
        email: email || null,
        ciudad: ciudad || null,
        tipo: tipo || null,
        empresa_id: empresaId ?? null,
      });
      if (!res.ok || !res.cliente) {
        setError(res.error ?? "No se pudo crear");
        return;
      }
      onCreated(res.cliente);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-[11.5px] text-ink-3">
        Cliente sin RFC todavía (lead). Cuando se gane la oportunidad podrás
        convertirlo a cliente formal y capturar los datos fiscales.
      </p>

      <div className="space-y-1">
        <Label htmlFor="qc_cli_razon" className="text-[11.5px]">
          Nombre / Razón social *
        </Label>
        <Input
          id="qc_cli_razon"
          value={razonSocial}
          onChange={(e) => setRazonSocial(e.target.value)}
          required
          maxLength={200}
          placeholder="Casa Don Juan / Juan Pérez"
          autoFocus
          className="h-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="qc_cli_nc" className="text-[11.5px]">
            Nombre comercial
          </Label>
          <Input
            id="qc_cli_nc"
            value={nombreComercial}
            onChange={(e) => setNombreComercial(e.target.value)}
            maxLength={120}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qc_cli_tipo" className="text-[11.5px]">
            Tipo
          </Label>
          <select
            id="qc_cli_tipo"
            value={tipo}
            onChange={(e) =>
              setTipo(
                e.target.value as
                  | "residencial"
                  | "comercial"
                  | "industrial"
                  | "gubernamental"
                  | "",
              )
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">—</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="qc_cli_tel" className="text-[11.5px]">
            Teléfono
          </Label>
          <Input
            id="qc_cli_tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            maxLength={30}
            placeholder="662 123 4567"
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qc_cli_email" className="text-[11.5px]">
            Email
          </Label>
          <Input
            id="qc_cli_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={120}
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="qc_cli_ciudad" className="text-[11.5px]">
          Ciudad
        </Label>
        <Input
          id="qc_cli_ciudad"
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
          maxLength={80}
          placeholder="Hermosillo, Sonora"
          className="h-9"
        />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creando…" : "Crear y seleccionar"}
        </Button>
      </div>
    </form>
  );
}
