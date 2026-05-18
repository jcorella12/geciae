"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";

import { eliminarMovimientoManual } from "./movimientos-actions";

/**
 * Botón inline de eliminar para movimientos manuales / CSV.
 * Solo se renderiza si esOrigenEditable(origen) en el padre.
 *
 * La edición completa requeriría un modal — por ahora solo se ofrece eliminar
 * como acción de seguridad. La edición se hará en un follow-up.
 */
export function MovimientoManualAcciones({ movId }: { movId: string }) {
  const [isPending, startTransition] = useTransition();

  const onEliminar = async () => {
    if (
      !(await confirm({
        message: "¿Eliminar este movimiento? Se recalcularán los saldos.",
        danger: true,
        confirmLabel: "Eliminar",
      }))
    ) {
      return;
    }
    startTransition(async () => {
      const res = await eliminarMovimientoManual(movId);
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onEliminar}
      disabled={isPending}
      title="Eliminar movimiento manual"
      aria-label="Eliminar movimiento"
      className="h-7 px-2 text-ink-3 hover:text-destructive"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
