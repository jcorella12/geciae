"use client";

import { Download } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  obtenerUrlPdf,
  obtenerUrlXml,
} from "../personas/cargar-nomina/actions";

/**
 * Botones de descarga XML/PDF de un recibo. Genera signed URL y abre en
 * pestaña nueva. Registra el acceso en bitácora de privacidad.
 */
export function DescargaReciboButtons({
  reciboId,
  tienePdf = false,
  size = "sm",
}: {
  reciboId: string;
  tienePdf?: boolean;
  size?: "sm" | "default";
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function descargar(tipo: "xml" | "pdf") {
    setError(null);
    start(async () => {
      const r = tipo === "xml"
        ? await obtenerUrlXml(reciboId)
        : await obtenerUrlPdf(reciboId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      // Abrir en nueva pestaña
      window.open(r.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size={size}
        disabled={pending}
        onClick={() => descargar("xml")}
        title="Descargar XML"
        className="h-7 px-2 text-[11px]"
      >
        <Download className="mr-1 h-3 w-3" />
        XML
      </Button>
      {tienePdf ? (
        <Button
          type="button"
          variant="ghost"
          size={size}
          disabled={pending}
          onClick={() => descargar("pdf")}
          title="Descargar PDF"
          className="h-7 px-2 text-[11px]"
        >
          <Download className="mr-1 h-3 w-3" />
          PDF
        </Button>
      ) : (
        <span
          className="text-[10px] text-muted-foreground"
          title="PDF no disponible"
        >
          —
        </span>
      )}
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  );
}
