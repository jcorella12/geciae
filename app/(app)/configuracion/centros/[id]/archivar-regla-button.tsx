"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  initialSimpleCentroState,
  type SimpleCentroState,
} from "@/lib/centros/state";

import { archivarReglaReparto } from "../actions";

const initial: SimpleCentroState = initialSimpleCentroState;

export function ArchivarReglaButton({ reglaId }: { reglaId: string }) {
  const [state, formAction] = useFormState(archivarReglaReparto, initial);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "¿Archivar esta regla? Dejará de aplicarse en futuros cierres mensuales.",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="regla_id" value={reglaId} />
      <SubmitArchivar />
      {state.error && (
        <p className="mt-1 text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}

function SubmitArchivar() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
    >
      {pending ? "…" : "Archivar"}
    </Button>
  );
}
