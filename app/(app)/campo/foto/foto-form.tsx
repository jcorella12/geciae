"use client";

import { Camera } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialSimpleFormState } from "@/lib/proyecto-extras/state";

import { subirDocumento } from "@/app/(app)/proyectos/[id]/documentos/actions";

export function FotoForm({
  proyecto,
}: {
  proyecto: { id: string; codigo: string; nombre: string };
}) {
  const [state, formAction] = useFormState(subirDocumento, initialSimpleFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setPreview(null);
      setExito(true);
    }
  }, [state.ok]);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <Link href="/campo/foto" className="text-[12px] text-brand hover:underline">
        ← Cambiar proyecto
      </Link>
      <div className="mt-1.5 flex items-center gap-2">
        <Camera className="h-5 w-5 text-brand" />
        <h1 className="text-[19px] font-semibold leading-tight">
          Foto / evidencia
        </h1>
      </div>
      <p className="mt-0.5 mb-4 text-[12.5px] text-ink-3">
        <span className="font-mono text-[11px]">{proyecto.codigo}</span>{" "}
        {proyecto.nombre}
      </p>

      {exito && (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
          ✓ Foto subida al proyecto. Puedes tomar otra.
        </p>
      )}

      <form
        ref={formRef}
        action={formAction}
        onChange={() => exito && setExito(false)}
        className="space-y-3"
      >
        <input type="hidden" name="proyecto_id" value={proyecto.id} />
        <input type="hidden" name="categoria" value="foto" />

        <label
          htmlFor="archivo"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card p-8 text-center hover:border-brand"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Vista previa"
              className="max-h-56 w-auto rounded-md object-contain"
            />
          ) : (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Camera className="h-7 w-7 text-emerald-700" />
              </span>
              <span className="text-[13px] font-semibold">Tomar / elegir foto</span>
              <span className="text-[10.5px] text-ink-3">
                Toca para abrir la cámara
              </span>
            </>
          )}
        </label>
        <Input
          id="archivo"
          name="archivo"
          type="file"
          accept="image/*"
          capture="environment"
          required
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />

        <Input
          name="nombre"
          placeholder="Nombre (opcional)"
          className="text-sm"
        />
        <textarea
          name="descripcion"
          rows={2}
          placeholder="Describe la evidencia (opcional): qué es, dónde…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />

        <label className="flex items-center gap-2 text-[12.5px]">
          <input type="checkbox" name="visible_cliente" className="h-4 w-4" />
          Visible para el cliente
        </label>

        {state.error && (
          <p className="text-[12px] text-destructive">{state.error}</p>
        )}

        <SubmitBtn />
      </form>
    </div>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? "Subiendo…" : "Subir foto"}
    </Button>
  );
}
