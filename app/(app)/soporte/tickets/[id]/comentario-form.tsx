"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { initialComentarioState } from "@/lib/tickets/state";

import { agregarComentarioTicket } from "../actions";

export function ComentarioForm({ ticketId }: { ticketId: string }) {
  const [state, formAction] = useFormState(
    agregarComentarioTicket,
    initialComentarioState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-t border-divider p-4"
    >
      <input type="hidden" name="ticket_id" value={ticketId} />
      <textarea
        name="contenido"
        rows={3}
        required
        placeholder="Agrega un comentario o nota interna…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-[12px]">
          <input type="checkbox" name="es_publico" className="h-4 w-4" />
          Visible para cliente (no marcar = nota interna)
        </label>
        {state.error && (
          <span className="text-[11px] text-destructive">{state.error}</span>
        )}
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Enviando…" : "Comentar"}
    </Button>
  );
}
