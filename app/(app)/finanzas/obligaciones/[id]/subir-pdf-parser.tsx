"use client";

import { Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  subirAcuseConParser,
  subirComprobanteConParser,
} from "../actions";

/**
 * Botón para subir PDF (acuse o comprobante) con parsing automático.
 * Lee el PDF server-side, extrae monto/fecha/línea/operación y los guarda
 * en obligaciones_sat.
 */
export function SubirPdfParser({
  obligacionId,
  tipo,
}: {
  obligacionId: string;
  tipo: "acuse" | "comprobante";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("obligacion_id", obligacionId);
    formData.append("archivo", file);

    startTransition(async () => {
      const action =
        tipo === "comprobante" ? subirComprobanteConParser : subirAcuseConParser;
      const r = await action({ ok: false, error: null }, formData);
      if (!r.ok) {
        setMensaje(`✗ ${r.error}`);
      } else if (r.error) {
        setMensaje(`⚠ ${r.error}`);
      } else {
        setMensaje(`✓ ${file.name} subido y datos extraídos.`);
      }
      // Reset input
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  const label = tipo === "comprobante" ? "Subir comprobante de pago" : "Subir acuse";
  const accept = "application/pdf,.pdf";

  return (
    <div className="inline-block">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        disabled={pending}
        className="hidden"
        id={`upload-${tipo}-${obligacionId}`}
      />
      <Button
        asChild
        variant={tipo === "comprobante" ? "default" : "outline"}
        size="sm"
        disabled={pending}
      >
        <label htmlFor={`upload-${tipo}-${obligacionId}`} className="cursor-pointer">
          <Upload className="h-3.5 w-3.5" />
          {pending ? "Procesando…" : label}
        </label>
      </Button>
      {mensaje && (
        <p
          className={`mt-1 text-[11.5px] ${
            mensaje.startsWith("✓")
              ? "text-emerald-700"
              : mensaje.startsWith("⚠")
                ? "text-amber-700"
                : "text-red-700"
          }`}
        >
          {mensaje}
        </p>
      )}
    </div>
  );
}
