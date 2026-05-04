"use client";

import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  initialSimpleCentroState,
  type SimpleCentroState,
} from "@/lib/centros/state";

import { archivarCentro } from "../actions";

const initial: SimpleCentroState = initialSimpleCentroState;

export function ArchivarCentroButton({ centroId }: { centroId: string }) {
  const router = useRouter();
  const [state, formAction] = useFormState(archivarCentro, initial);

  useEffect(() => {
    if (state.ok) {
      router.push("/configuracion/centros");
    }
  }, [state.ok, router]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "¿Archivar este centro? No se podrá usar para nuevas asignaciones, pero su histórico se conserva.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="centro_id" value={centroId} />
      <SubmitArchivar />
      {state.error && (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

function SubmitArchivar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending} size="sm">
      {pending ? "Archivando…" : "Archivar centro"}
    </Button>
  );
}
