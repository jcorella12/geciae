"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { toggleActivoCliente } from "../actions";

export function ToggleActivoButton({
  clienteId,
  activo,
}: {
  clienteId: string;
  activo: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const accion = activo ? "desactivar" : "reactivar";
    if (!confirm(`¿Seguro que quieres ${accion} este cliente?`)) return;
    startTransition(async () => {
      const res = await toggleActivoCliente(clienteId, !activo);
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
      {isPending ? "..." : activo ? "Desactivar" : "Reactivar"}
    </Button>
  );
}
