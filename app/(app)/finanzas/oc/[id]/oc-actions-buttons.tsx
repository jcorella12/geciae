"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { promptInput } from "@/components/ui/prompt-input";

import {
  aprobarOC,
  cancelarOC,
  enviarAAprobacion,
  rechazarOC,
  regresarOCABorrador,
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

  async function pedirMotivo(label: string): Promise<string | null> {
    return await promptInput({
      title: `Motivo de ${label}`,
      message: `Indica el motivo de ${label} (mínimo 5 caracteres).`,
      label: "Motivo",
      minLength: 5,
      multiline: true,
    });
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
              onClick={async () => {
                if (!(await confirm("¿Aprobar esta OC?"))) return;
                run(() => aprobarOC(ocId));
              }}
              disabled={isPending}
            >
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                const motivo = await pedirMotivo("rechazo");
                if (!motivo) return;
                run(() => rechazarOC(ocId, motivo));
              }}
              disabled={isPending}
            >
              Rechazar
            </Button>
          </>
        )}

        {estado === "aprobada" && puedeAprobar && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const motivo = await pedirMotivo("regreso a borrador");
              if (!motivo) return;
              if (
                !(await confirm({
                  message:
                    "¿Regresar esta OC a borrador? Se borrará el registro de aprobación y el movimiento de centro (si lo hay). El folio NO se pierde.",
                  danger: true,
                  confirmLabel: "Regresar a borrador",
                }))
              )
                return;
              run(() => regresarOCABorrador(ocId, motivo));
            }}
            disabled={isPending}
          >
            Regresar a borrador
          </Button>
        )}

        {!["pagada", "cancelada"].includes(estado) && (esCapturador || puedeAprobar) && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const motivo = await pedirMotivo("cancelación");
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
