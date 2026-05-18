"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/notify";

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
          notify({ message: `Error HTTP ${res.status}`, variant: "error" });
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
        notify({
          message: `Error al exportar: ${(e as Error).message}`,
          variant: "error",
        });
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
