"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agregarDocumento } from "@/app/(app)/finanzas/ajustes-gerenciales/actions";
import {
  ETIQUETA_TIPO_DOCUMENTO,
  type TipoDocumentoAjuste,
} from "@/lib/ajustes-gerenciales/state";

const TIPOS = Object.keys(ETIQUETA_TIPO_DOCUMENTO) as TipoDocumentoAjuste[];

export function SubirDocumento({ ajusteId }: { ajusteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("ajuste_id", ajusteId);
    setError(null);
    startTransition(async () => {
      const r = await agregarDocumento(formData);
      if (!r.ok) setError(r.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        + Subir documento
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-[11.5px] font-medium">Tipo</label>
        <select
          name="tipo_documento"
          required
          className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[12.5px]"
        >
          <option value="">Selecciona…</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO_DOCUMENTO[t]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[11.5px] font-medium">Archivo</label>
        <input
          type="file"
          name="archivo"
          required
          className="block w-full text-[11.5px]"
        />
      </div>

      <div>
        <label className="mb-1 block text-[11.5px] font-medium">
          Nombre (opcional)
        </label>
        <Input type="text" name="nombre" placeholder="Auto del archivo" />
      </div>

      <div>
        <label className="mb-1 block text-[11.5px] font-medium">
          Fecha del doc. (opcional)
        </label>
        <Input type="date" name="fecha_documento" />
      </div>

      {error && (
        <p className="text-[11px] text-danger-deep">{error}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? "Subiendo…" : "Subir"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
