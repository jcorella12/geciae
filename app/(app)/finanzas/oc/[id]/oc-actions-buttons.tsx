"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  aprobarOC,
  cancelarOC,
  enviarAAprobacion,
  rechazarOC,
} from "../actions";

export function OCActionButtons({
  ocId,
  estado,
  puedeAprobar,
  esCapturador,
}: {
  ocId: string;
  estado: string;
  puedeAprobar: boolean;
  esCapturador: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
    });
  }

  function pedirMotivo(label: string): string | null {
    const m = window.prompt(`Motivo de ${label} (mín 5 caracteres):`);
    if (!m || m.trim().length < 5) {
      alert("Motivo requerido (al menos 5 caracteres).");
      return null;
    }
    return m.trim();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {estado === "borrador" && esCapturador && (
          <Button
            size="sm"
            onClick={() => run(() => enviarAAprobacion(ocId))}
            disabled={isPending}
          >
            Enviar a aprobación
          </Button>
        )}

        {estado === "pendiente_aprobacion" && puedeAprobar && (
          <>
            <Button
              size="sm"
              onClick={() => {
                if (!confirm("¿Aprobar esta OC?")) return;
                run(() => aprobarOC(ocId));
              }}
              disabled={isPending}
            >
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                const motivo = pedirMotivo("rechazo");
                if (!motivo) return;
                run(() => rechazarOC(ocId, motivo));
              }}
              disabled={isPending}
            >
              Rechazar
            </Button>
          </>
        )}

        {!["pagada", "cancelada"].includes(estado) && (esCapturador || puedeAprobar) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const motivo = pedirMotivo("cancelación");
              if (!motivo) return;
              run(() => cancelarOC(ocId, motivo));
            }}
            disabled={isPending}
          >
            Cancelar OC
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
