"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { toggleActivoProveedor } from "../actions";

export function ToggleActivoProveedorButton({
  proveedorId,
  activo,
}: {
  proveedorId: string;
  activo: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const accion = activo ? "desactivar" : "reactivar";
    if (!confirm(`¿Seguro que quieres ${accion} este proveedor?`)) return;
    startTransition(async () => {
      const res = await toggleActivoProveedor(proveedorId, !activo);
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
