"use client";

import { Loader2, Sparkles, Upload, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  procesarFacturaVehiculo,
  type VehiculoDefaults,
} from "./ia-actions";

/**
 * S3-T4 — Uploader IA para factura de vehículo.
 *
 * El usuario arrastra/elige el PDF o la foto de la factura. Claude
 * Haiku extrae marca/modelo/serie/etc. y los pre-llena en el formulario
 * de captura via callback `onExtracted`.
 */
export function FacturaVehiculoIaUploader({
  onExtracted,
}: {
  onExtracted: (defaults: VehiculoDefaults) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [meta, setMeta] = useState<{
    confidence: number;
    cache_hit: boolean;
    costo_usd: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function processFile(f: File) {
    setError(null);
    setMeta(null);
    setFile(f);
    const fd = new FormData();
    fd.append("archivo", f);
    startTransition(async () => {
      const r = await procesarFacturaVehiculo(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMeta(r.meta);
      onExtracted(r.defaults);
    });
  }

  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-700" />
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-emerald-900">
            Auto-llenar con la factura del vehículo (IA)
          </h2>
          <p className="mt-0.5 text-[12px] text-emerald-800">
            Sube el PDF o foto de la factura — Claude Haiku extrae marca,
            modelo, serie/VIN, año y costo. Costo aproximado: ~$0.005 USD
            por documento.
          </p>

          {!file && (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) processFile(f);
              }}
              className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-[12.5px] transition ${
                dragOver
                  ? "border-emerald-500 bg-emerald-100"
                  : "border-emerald-300 bg-white hover:bg-emerald-50"
              }`}
            >
              <Upload className="h-4 w-4 text-emerald-700" />
              <span>Arrastra el PDF/foto o haz click</span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processFile(f);
                }}
                className="hidden"
              />
            </label>
          )}

          {file && pending && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-white px-3 py-2 text-[12.5px]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
              Procesando {file.name}…
            </div>
          )}

          {meta && (
            <div className="mt-3 rounded-md border border-emerald-300 bg-white px-3 py-2 text-[12.5px]">
              <div className="flex items-center justify-between">
                <span className="font-medium text-emerald-900">
                  ✓ Datos extraídos
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setMeta(null);
                    setError(null);
                  }}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-0.5 text-[11px] text-emerald-700">
                Confianza: {(meta.confidence * 100).toFixed(0)}% ·{" "}
                {meta.cache_hit ? "cache" : `costo ~$${meta.costo_usd.toFixed(3)}`} ·
                revisa los campos pre-llenados antes de guardar.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center justify-between rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-900">
              <span>{error}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  setError(null);
                }}
              >
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
