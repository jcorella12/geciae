"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type Tipo =
  | "cfdi"
  | "oc"
  | "proyectos"
  | "oportunidades"
  | "tickets"
  | "vehiculos"
  | "inventario";

/**
 * Botón para descargar un CSV del listado actual.
 * Respeta el filtro de empresa activa del switcher.
 */
export function ExportCsvButton({
  tipo,
  desde,
  hasta,
  variant = "outline",
  size = "sm",
}: {
  tipo: Tipo;
  desde?: string;
  hasta?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm";
}) {
  const params = new URLSearchParams({ reporte: tipo });
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const url = `/api/reportes/csv?${params.toString()}`;

  return (
    <Button variant={variant} size={size} asChild>
      <a href={url} download>
        <Download className="h-3.5 w-3.5" />
        Exportar CSV
      </a>
    </Button>
  );
}
