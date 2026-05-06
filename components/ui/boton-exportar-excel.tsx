"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

/**
 * Botón genérico para exportar un endpoint a Excel.
 * Hace fetch a `endpoint`, recibe blob xlsx, dispara descarga.
 */
export function BotonExportarExcel({
  endpoint,
  nombreArchivo,
  label = "Exportar Excel",
}: {
  endpoint: string;
  nombreArchivo: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  function descargar() {
    startTransition(async () => {
      try {
        const res = await fetch(endpoint, { credentials: "include" });
        if (!res.ok) {
          alert(`Error: ${res.status}`);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        alert(`Error al exportar: ${(e as Error).message}`);
      }
    });
  }

  return (
    <Button variant="outline" onClick={descargar} disabled={pending}>
      <Download className="h-4 w-4" />
      {pending ? "Generando…" : label}
    </Button>
  );
}
