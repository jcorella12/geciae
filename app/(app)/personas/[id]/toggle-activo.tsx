"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { toggleActivoEmpleado } from "../actions";

export function ToggleActivoEmpleadoButton({
  empleadoId,
  empresaId,
  activo,
}: {
  empleadoId: string;
  empresaId: string;
  activo: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const accion = activo ? "dar de baja" : "reactivar";
    if (!confirm(`¿Seguro que quieres ${accion} a este empleado?`)) return;
    startTransition(async () => {
      const res = await toggleActivoEmpleado(empleadoId, empresaId, !activo);
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? "..." : activo ? "Dar de baja" : "Reactivar"}
    </Button>
  );
}
