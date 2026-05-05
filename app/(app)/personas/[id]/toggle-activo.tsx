"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { toggleActivoEmpleado } from "../actions";

export function ToggleActivoEmpleadoButton({
  empleadoId,
  empresaId,
  activo,
  tieneCuenta = false,
}: {
  empleadoId: string;
  empresaId: string;
  activo: boolean;
  /** Si tiene usuario_id vinculado, advertir que perderá acceso. */
  tieneCuenta?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    let mensaje: string;
    if (activo) {
      mensaje = "¿Seguro que quieres dar de baja a este empleado?";
      if (tieneCuenta) {
        mensaje +=
          "\n\n⚠ Este empleado tiene cuenta vinculada. Al darlo de baja PERDERÁ EL ACCESO a la app automáticamente (todos sus vínculos con empresas se desactivan). Si vuelve, sólo se reactiva el vínculo principal — los atributos extra los tendrás que reasignar manualmente.";
      }
    } else {
      mensaje = "¿Reactivar a este empleado?";
      if (tieneCuenta) {
        mensaje +=
          "\n\nSe reactivará el vínculo con la empresa del empleado. Los vínculos con OTRAS empresas (si tenía) NO se reactivan automáticamente.";
      }
    }
    if (!confirm(mensaje)) return;
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
      className={
        activo && tieneCuenta
          ? "border-amber-300 text-amber-700 hover:bg-amber-50"
          : undefined
      }
    >
      {isPending ? "..." : activo ? "Dar de baja" : "Reactivar"}
    </Button>
  );
}
