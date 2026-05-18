"use client";

import { Download, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import {
  estadoVigencia,
  tipoDocumentoLabel,
  VIGENCIA_BADGE,
  VIGENCIA_LABEL,
} from "@/lib/proveedores/docs";
import { cn } from "@/lib/utils";

import { eliminarDocumentoProveedor, obtenerUrlFirmada } from "./actions";

export type DocItem = {
  id: string;
  tipo_documento: string;
  url_archivo: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  numero_referencia: string | null;
  observaciones: string | null;
  fecha_validacion: string | null;
  created_at: string | null;
};

export function DocRow({
  doc,
  proveedorId,
  puedeGestionar,
}: {
  doc: DocItem;
  proveedorId: string;
  puedeGestionar: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const vigencia = estadoVigencia(doc.fecha_vencimiento);

  async function descargar() {
    if (!doc.url_archivo) return;
    const res = await obtenerUrlFirmada(doc.url_archivo);
    if (res.url) {
      window.open(res.url, "_blank", "noopener,noreferrer");
    } else {
      alert(`Error: ${res.error}`);
    }
  }

  async function eliminar() {
    if (
      !(await confirm({
        message:
          "¿Eliminar este documento? Se borra el archivo y se recalcula el semáforo del proveedor.",
        danger: true,
        confirmLabel: "Eliminar",
      }))
    )
      return;
    startTransition(async () => {
      const res = await eliminarDocumentoProveedor(proveedorId, doc.id);
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  }

  return (
    <li className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">
            {tipoDocumentoLabel(doc.tipo_documento)}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs",
              VIGENCIA_BADGE[vigencia],
            )}
          >
            {VIGENCIA_LABEL[vigencia]}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {doc.fecha_emision && (
            <span>
              Emitida {new Date(doc.fecha_emision).toLocaleDateString("es-MX")}
            </span>
          )}
          {doc.fecha_vencimiento && (
            <span>
              Vence{" "}
              {new Date(doc.fecha_vencimiento).toLocaleDateString("es-MX")}
            </span>
          )}
          {doc.numero_referencia && <span>Ref. {doc.numero_referencia}</span>}
          {doc.fecha_validacion && (
            <span className="text-success">
              ✓ Validado{" "}
              {new Date(doc.fecha_validacion).toLocaleDateString("es-MX")}
            </span>
          )}
        </div>
        {doc.observaciones && (
          <p className="mt-1 text-xs text-muted-foreground">
            {doc.observaciones}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        {doc.url_archivo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={descargar}
            title="Ver archivo"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
        {puedeGestionar && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={eliminar}
            disabled={isPending}
            title="Eliminar documento"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
