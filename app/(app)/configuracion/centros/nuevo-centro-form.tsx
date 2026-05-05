"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DESCRIPCION_SUBTIPO_CENTRO,
  ETIQUETA_SUBTIPO_CENTRO,
  ETIQUETA_TIPO_CENTRO,
  initialCentroState,
  SUBTIPOS_CENTRO,
  TIPOS_CENTRO,
  subtipoTipoSugerido,
  type SubtipoCentro,
  type TipoCentro,
} from "@/lib/centros/state";

import { crearCentro } from "./actions";

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
  subtipo: SubtipoCentro;
};

export function NuevoCentroForm({
  empresas,
  centros,
}: {
  empresas: EmpresaOption[];
  centros: CentroOption[];
}) {
  const [state, formAction] = useFormState(crearCentro, initialCentroState);
  const [open, setOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState<string>(empresas[0]?.id ?? "");
  const [subtipo, setSubtipo] = useState<SubtipoCentro>("operativo");
  const tipoSugerido = subtipoTipoSugerido(subtipo);
  const [tipoOverride, setTipoOverride] = useState<TipoCentro | null>(null);
  const tipo: TipoCentro = tipoOverride ?? tipoSugerido ?? "costo";

  const padresPosibles = centros.filter(
    (c) => c.empresa_id === empresaId && !c.codigo.includes("__sub__"),
  );

  if (!open) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-base font-semibold">Centros de costo y utilidad</h2>
          <p className="text-sm text-muted-foreground">
            Crea CC para servicios compartidos o áreas operativas, y CU para líneas de venta.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Nuevo centro</Button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-sm"
      key={state.ok ? "reset" : "form"}
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">Nuevo centro</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Empresa + código único + subtipo determinan el comportamiento.
          </p>
        </div>
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
          <Label htmlFor="empresa_id">Empresa</Label>
          <select
            id="empresa_id"
            name="empresa_id"
            required
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} — {e.nombre_comercial ?? e.razon_social}
              </option>
            ))}
          </select>
          {state.fieldErrors?.empresa_id && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.empresa_id[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="codigo">Código</Label>
          <Input
            id="codigo"
            name="codigo"
            type="text"
            required
            placeholder="ADMIN_PSE"
            maxLength={32}
            className="uppercase"
          />
          <p className="text-xs text-muted-foreground">
            Letras, números, guion y guion bajo. Único por empresa.
          </p>
          {state.fieldErrors?.codigo && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.codigo[0]}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          type="text"
          required
          placeholder="Administración corporativa"
          maxLength={120}
        />
        {state.fieldErrors?.nombre && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.nombre[0]}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="subtipo">Subtipo</Label>
          <select
            id="subtipo"
            name="subtipo"
            required
            value={subtipo}
            onChange={(e) => {
              setSubtipo(e.target.value as SubtipoCentro);
              setTipoOverride(null);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SUBTIPOS_CENTRO.map((s) => (
              <option key={s} value={s}>
                {ETIQUETA_SUBTIPO_CENTRO[s]}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {DESCRIPCION_SUBTIPO_CENTRO[subtipo]}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          {/* Cuando está disabled, <select> NO envía valor al FormData;
              usamos un hidden input para que el server action reciba el tipo. */}
          {tipoSugerido !== null && (
            <input type="hidden" name="tipo" value={tipo} />
          )}
          <select
            id="tipo"
            name={tipoSugerido !== null ? undefined : "tipo"}
            required={tipoSugerido === null}
            value={tipo}
            disabled={tipoSugerido !== null}
            onChange={(e) => setTipoOverride(e.target.value as TipoCentro)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
          >
            {TIPOS_CENTRO.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_CENTRO[t]}
              </option>
            ))}
          </select>
          {tipoSugerido !== null ? (
            <p className="text-xs text-muted-foreground">
              Determinado por el subtipo (no editable).
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Subtipo &quot;Otro&quot; permite cualquier tipo.
            </p>
          )}
          {state.fieldErrors?.tipo && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.tipo[0]}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="centro_padre_id">
            Centro padre (opcional)
          </Label>
          <select
            id="centro_padre_id"
            name="centro_padre_id"
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— ninguno —</option>
            {padresPosibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nombre}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Sub-centro. Útil para desglosar Ventas en levantamientos por vendedor.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="presupuesto_anual">
            Presupuesto anual (opcional)
          </Label>
          <Input
            id="presupuesto_anual"
            name="presupuesto_anual"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
          />
          {state.fieldErrors?.presupuesto_anual && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.presupuesto_anual[0]}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción (opcional)</Label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={2}
          maxLength={2000}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Para qué sirve este centro y cómo se reparte."
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          Centro creado.
        </p>
      )}

      <div className="flex gap-2">
        <SubmitButton />
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cerrar
        </Button>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando…" : "Crear centro"}
    </Button>
  );
}
