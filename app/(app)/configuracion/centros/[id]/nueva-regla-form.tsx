"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DESCRIPCION_METODO_REPARTO,
  ETIQUETA_EMISION_REPARTO,
  ETIQUETA_METODO_REPARTO,
  initialReglaRepartoState,
  METODOS_REPARTO,
  TIPOS_EMISION_REPARTO,
  type MetodoReparto,
} from "@/lib/centros/state";

import { crearReglaReparto } from "../actions";

type EmpresaOption = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

type CentroOption = {
  id: string;
  empresa_id: string;
  codigo: string;
  nombre: string;
};

export function NuevaReglaForm({
  centroOrigenId,
  empresaOrigenId,
  empresas,
  centrosDestinoPorEmpresa,
}: {
  centroOrigenId: string;
  empresaOrigenId: string;
  empresas: EmpresaOption[];
  centrosDestinoPorEmpresa: Record<string, CentroOption[]>;
}) {
  const [state, formAction] = useFormState(
    crearReglaReparto,
    initialReglaRepartoState,
  );
  const [open, setOpen] = useState(false);
  const [metodo, setMetodo] = useState<MetodoReparto>("porcentaje_fijo");
  const empresasDestino = empresas.filter((e) => e.id !== empresaOrigenId);
  const [empresaDestinoId, setEmpresaDestinoId] = useState<string>(
    empresasDestino[0]?.id ?? "",
  );
  const centrosDestino = centrosDestinoPorEmpresa[empresaDestinoId] ?? [];

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Nueva regla de reparto
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      key={state.ok ? "reset" : "form"}
      className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <input type="hidden" name="centro_origen_id" value={centroOrigenId} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Nueva regla de reparto</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="empresa_destino_id">Empresa destino</Label>
          <select
            id="empresa_destino_id"
            name="empresa_destino_id"
            required
            value={empresaDestinoId}
            onChange={(e) => setEmpresaDestinoId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {empresasDestino.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} — {e.nombre_comercial ?? e.razon_social}
              </option>
            ))}
          </select>
          {state.fieldErrors?.empresa_destino_id && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.empresa_destino_id[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="centro_destino_id">
            Centro destino (opcional)
          </Label>
          <select
            id="centro_destino_id"
            name="centro_destino_id"
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— gasto general (sin centro) —</option>
            {centrosDestino.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="metodo">Método</Label>
          <select
            id="metodo"
            name="metodo"
            required
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as MetodoReparto)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {METODOS_REPARTO.map((m) => (
              <option key={m} value={m}>
                {ETIQUETA_METODO_REPARTO[m]}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {DESCRIPCION_METODO_REPARTO[metodo]}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="valor">
            Valor{" "}
            {metodo === "porcentaje_fijo" ? (
              <span className="text-xs text-muted-foreground">
                (% entre 0 y 100)
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                (factor opcional)
              </span>
            )}
          </Label>
          <Input
            id="valor"
            name="valor"
            type="number"
            step="0.01"
            min={metodo === "porcentaje_fijo" ? "0.01" : "0"}
            max={metodo === "porcentaje_fijo" ? "100" : undefined}
            required={metodo === "porcentaje_fijo"}
            placeholder={metodo === "porcentaje_fijo" ? "33.33" : "1.00"}
          />
          {state.fieldErrors?.valor && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.valor[0]}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emision">Emisión</Label>
        <select
          id="emision"
          name="emision"
          required
          defaultValue="asiento_interno"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {TIPOS_EMISION_REPARTO.map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_EMISION_REPARTO[e]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          CFDI inter-co emite factura mensual entre empresas. Asiento interno
          solo registra contablemente sin CFDI (recomendado para servicios
          compartidos del grupo).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vigencia_desde">Vigencia desde</Label>
          <Input
            id="vigencia_desde"
            name="vigencia_desde"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
          {state.fieldErrors?.vigencia_desde && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.vigencia_desde[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vigencia_hasta">
            Vigencia hasta (opcional)
          </Label>
          <Input
            id="vigencia_hasta"
            name="vigencia_hasta"
            type="date"
          />
          {state.fieldErrors?.vigencia_hasta && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.vigencia_hasta[0]}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={2}
          maxLength={2000}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Justificación o nota interna"
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          Regla creada.
        </p>
      )}

      <SubmitNuevaRegla />
    </form>
  );
}

function SubmitNuevaRegla() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Crear regla"}
    </Button>
  );
}
