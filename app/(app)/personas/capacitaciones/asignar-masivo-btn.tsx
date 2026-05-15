"use client";

import { Users2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import {
  AsignarMasivoDialog,
  type EmpleadoLite,
} from "./asignar-masivo-dialog";

type Props = {
  curso: { id: string; codigo: string; nombre: string };
  empleados: EmpleadoLite[];
};

export function AsignarMasivoBtn({ curso, empleados }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Asignar este curso a varios empleados a la vez"
      >
        <Users2 className="mr-1 h-3.5 w-3.5" />
        Asignar a varios
      </Button>
      {open && (
        <AsignarMasivoDialog
          curso={curso}
          empleados={empleados}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
