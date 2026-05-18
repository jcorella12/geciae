"use client";

import { Download, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";

import {
  eliminarAcuse,
  eliminarComprobante,
  getDownloadUrlObligacion,
} from "../actions";

/**
 * Card de documento (acuse / comprobante) con descarga + eliminar.
 *
 * El path en bucket es privado; pedimos URL firmada (10 min) al servidor.
 */
export function DownloadDocumento({
  label,
  path,
  kind,
  obligacionId,
  puedeEliminar,
}: {
  label: string;
  path: string;
  kind: "acuse" | "comprobante";
  obligacionId: string;
  puedeEliminar: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const onDownload = async () => {
    const url = await getDownloadUrlObligacion(path);
    if (url) window.open(url, "_blank");
    else alert("No se pudo generar URL de descarga.");
  };

  const onEliminar = async () => {
    if (
      !(await confirm({
        message: `¿Eliminar ${label}? Esta acción no se puede deshacer.`,
        danger: true,
        confirmLabel: "Eliminar",
      }))
    ) {
      return;
    }
    startTransition(async () => {
      const fn = kind === "acuse" ? eliminarAcuse : eliminarComprobante;
      const res = await fn(obligacionId);
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  };

  const fileName = path.split("/").pop() ?? path;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-2/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium">{label}</p>
        <p className="truncate font-mono text-[10.5px] text-ink-3">
          {fileName}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDownload}
          aria-label="Descargar"
          title="Descargar"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        {puedeEliminar && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEliminar}
            disabled={isPending}
            aria-label="Eliminar"
            title="Eliminar"
            className="text-ink-3 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
