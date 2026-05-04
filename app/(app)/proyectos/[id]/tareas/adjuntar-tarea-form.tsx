"use client";

import { Paperclip } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { initialSimpleState } from "@/lib/proyecto-tareas/state";

import { adjuntarArchivoATarea } from "./actions";

export function AdjuntarTareaForm({
  proyectoId,
  tareaId,
}: {
  proyectoId: string;
  tareaId: string;
}) {
  const [state, formAction] = useFormState(
    adjuntarArchivoATarea,
    initialSimpleState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="inline-flex">
      <input type="hidden" name="proyecto_id" value={proyectoId} />
      <input type="hidden" name="tarea_id" value={tareaId} />
      <input
        ref={inputRef}
        type="file"
        name="archivo"
        onChange={() => formRef.current?.requestSubmit()}
        className="hidden"
      />
      <PickBtn onClick={() => inputRef.current?.click()} error={state.error} />
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
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={error ?? "Adjuntar archivo a esta tarea"}
      className="text-ink-3 hover:text-brand disabled:opacity-50"
      aria-label="Adjuntar archivo"
    >
      <Paperclip
        className={`h-3.5 w-3.5 ${pending ? "animate-pulse" : ""} ${error ? "text-destructive" : ""}`}
      />
    </button>
  );
}
