"use client";

import { Paperclip } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { initialSimpleState } from "@/lib/proyecto-reportes/state";

import { adjuntarArchivoAReporte } from "./actions";

export function AdjuntarArchivoForm({
  proyectoId,
  reporteId,
}: {
  proyectoId: string;
  reporteId: string;
}) {
  const [state, formAction] = useFormState(
    adjuntarArchivoAReporte,
    initialSimpleState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  const onPick = () => inputRef.current?.click();
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      formRef.current?.requestSubmit();
    }
  };

  return (
    <form ref={formRef} action={formAction} className="inline-flex">
      <input type="hidden" name="proyecto_id" value={proyectoId} />
      <input type="hidden" name="reporte_id" value={reporteId} />
      <input
        ref={inputRef}
        type="file"
        name="archivo"
        onChange={onChange}
        className="hidden"
      />
      <PickBtn onClick={onPick} error={state.error} />
    </form>
  );
}

function PickBtn({
  onClick,
  error,
}: {
  onClick: () => void;
  error: string | null;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-[10px] text-destructive">{error}</span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="flex items-center gap-1 text-[11px] text-brand hover:text-brand-deep disabled:opacity-50"
      >
        <Paperclip className="h-3 w-3" />
        {pending ? "Subiendo…" : "Adjuntar archivo"}
      </button>
    </div>
  );
}
