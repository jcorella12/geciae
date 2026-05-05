"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { initialSimpleLevState } from "@/lib/levantamientos/state";

import { completarPaso } from "../actions";

export function CompletarPasoForm({
  levantamientoId,
  pasoNumero,
}: {
  levantamientoId: string;
  pasoNumero: number;
}) {
  const [state, formAction] = useFormState(completarPaso, initialSimpleLevState);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="levantamiento_id" value={levantamientoId} />
      <input type="hidden" name="paso_numero" value={pasoNumero} />
      <SubmitBtn />
      {state.error && (
        <span className="text-xs text-destructive">{state.error}</span>
      )}
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "Completando…" : "Marcar completado"}
    </Button>
  );
}
