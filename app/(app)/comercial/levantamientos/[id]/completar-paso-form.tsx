"use client";

import { CloudOff } from "lucide-react";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/notify";
import { useOnline } from "@/lib/hooks/use-online";
import { initialSimpleLevState } from "@/lib/levantamientos/state";
import { enqueue } from "@/lib/offline/queue";

import { completarPaso } from "../actions";

export function CompletarPasoForm({
  levantamientoId,
  pasoNumero,
}: {
  levantamientoId: string;
  pasoNumero: number;
}) {
  const [state, formAction] = useFormState(completarPaso, initialSimpleLevState);
  const online = useOnline();
  const [offlineError, setOfflineError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        if (online) return; // dejar pasar al action={formAction}
        e.preventDefault();
        setOfflineError(null);
        try {
          await enqueue(
            "levantamiento.completarPaso",
            {
              levantamiento_id: levantamientoId,
              paso_numero: String(pasoNumero),
              observaciones: "",
            },
            `Levantamiento · Paso ${pasoNumero} completado`,
          );
          notify({
            message: "Paso marcado offline. Se enviará al volver la red.",
            variant: "success",
          });
        } catch (err) {
          setOfflineError(
            `No se pudo guardar offline: ${(err as Error).message}`,
          );
        }
      }}
      action={formAction}
      className="inline-flex items-center gap-2"
    >
      <input type="hidden" name="levantamiento_id" value={levantamientoId} />
      <input type="hidden" name="paso_numero" value={pasoNumero} />
      <SubmitBtn offline={!online} />
      {!online && (
        <span
          className="inline-flex items-center gap-1 text-[10.5px] text-amber-700"
          title="Sin conexión — se sincronizará después"
        >
          <CloudOff className="h-3 w-3" />
          offline
        </span>
      )}
      {(state.error || offlineError) && (
        <span className="text-xs text-destructive">
          {offlineError ?? state.error}
        </span>
      )}
    </form>
  );
}

function SubmitBtn({ offline }: { offline?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending
        ? "Completando…"
        : offline
          ? "Marcar (offline)"
          : "Marcar completado"}
    </Button>
  );
}
