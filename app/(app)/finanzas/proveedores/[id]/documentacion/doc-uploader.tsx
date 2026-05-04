"use client";

import { Upload } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialDocState, TIPOS_DOCUMENTO_PROVEEDOR } from "@/lib/proveedores/docs";

import { subirDocumentoProveedor } from "./actions";

export function DocUploader({
  proveedorId,
  requiereRepse,
}: {
  proveedorId: string;
  requiereRepse: boolean;
}) {
  const [state, formAction] = useFormState(
    subirDocumentoProveedor.bind(null, proveedorId),
    initialDocState,
  );
  const [tipo, setTipo] = useState("csf");

  const tipoActual = TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.value === tipo);
  const tiposDisponibles = TIPOS_DOCUMENTO_PROVEEDOR.filter(
    (t) => t.general || requiereRepse,
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
      key={state.ok ? "reset" : "form"}
    >
      <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Subir documento
      </h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="tipo_documento">Tipo de documento</Label>
          <select
            id="tipo_documento"
            name="tipo_documento"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {tiposDisponibles.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {tipoActual && (
            <p className="text-xs text-muted-foreground">{tipoActual.descripcion}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="fecha_emision">Fecha de emisión</Label>
          <Input id="fecha_emision" name="fecha_emision" type="date" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha_vencimiento">Fecha de vencimiento</Label>
          <Input
            id="fecha_vencimiento"
            name="fecha_vencimiento"
            type="date"
          />
          <p className="text-xs text-muted-foreground">
            Opcional. Si la captures, el sistema actualiza el semáforo del
            proveedor cuando se acerque o pase la fecha.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="numero_referencia">Número de referencia</Label>
          <Input
            id="numero_referencia"
            name="numero_referencia"
            placeholder="Folio, ID o referencia interna"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="archivo">Archivo (PDF, JPG, PNG, WEBP, máx 10 MB)</Label>
          <Input
            id="archivo"
            name="archivo"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            required
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="observaciones">Observaciones (opcional)</Label>
          <textarea
            id="observaciones"
            name="observaciones"
            rows={2}
            maxLength={1000}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {state.error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="mt-4">
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Upload className="h-4 w-4" />
      {pending ? "Subiendo…" : "Subir documento"}
    </Button>
  );
}
