"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { notify } from "@/components/ui/notify";

import { toggleActivoCliente } from "../actions";

export function ToggleActivoButton({
  clienteId,
  activo,
}: {
  clienteId: string;
  activo: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    const accion = activo ? "desactivar" : "reactivar";
    if (
      !(await confirm({
        message: `¿Seguro que quieres ${accion} este cliente?`,
        danger: activo,
      }))
    )
      return;
    startTransition(async () => {
      const res = await toggleActivoCliente(clienteId, !activo);
      if (!res.ok) notify({ message: res.error ?? "Error", variant: "error" });
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
