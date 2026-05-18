"use client";

import { Lock } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";

import { cerrarInteresesMes } from "../prestamos/actions";

/**
 * Cierre formal del mes de intereses inter-co. Snapshot por par de empresas.
 * Idempotente — se puede correr de nuevo si hay ajustes.
 */
export function CerrarMesBtn({ anio, mes }: { anio: number; mes: number }) {
  const [pending, start] = useTransition();

  async function cerrar() {
    if (
      !(await confirm(
        `¿Cerrar intereses de ${String(mes).padStart(2, "0")}/${anio}?\n\nEsto genera (o regenera) el snapshot por par de empresas. Idempotente — puedes correrlo de nuevo si hay ajustes después.`,
      ))
    ) {
      return;
    }
    start(async () => {
      const r = await cerrarInteresesMes(anio, mes);
      if (!r.ok) {
        alert(`Error: ${r.error}`);
        return;
      }
      alert(
        `✓ ${r.count} par(es) de empresas cerrados. Snapshot guardado en cierres_intereses_mensuales.`,
      );
    });
  }

  return (
    <Button onClick={cerrar} disabled={pending} variant="outline" size="sm">
      <Lock className="h-3.5 w-3.5" />
      {pending ? "Cerrando…" : `Cerrar ${String(mes).padStart(2, "0")}/${anio}`}
    </Button>
  );
}
