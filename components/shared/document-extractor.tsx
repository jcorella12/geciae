"use client";

import { Sparkles } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

export type ExtractMeta = {
  cache_hit: boolean;
  latencia_ms: number;
  confidence: number;
  costo_usd: number;
};

export type ExtractActionResult<T> =
  | { ok: true; defaults: T; meta: ExtractMeta }
  | { ok: false; error: string };

type Props<T> = {
  /** MIME types aceptados, ej. "image/jpeg,image/png,application/pdf" */
  accept: string;
  /** Texto principal del card */
  label: string;
  /** Descripción / instrucciones */
  description: string;
  /** Server action que recibe FormData con el archivo (campo `archivo`) */
  onProcess: (formData: FormData) => Promise<ExtractActionResult<T>>;
  /** Callback cuando se extraen datos */
  onExtracted: (defaults: T) => void;
  /** Tamaño máximo en MB (default 10) */
  maxMb?: number;
};

export function DocumentExtractor<T>({
  accept,
  label,
  description,
  onProcess,
  onExtracted,
  maxMb = 10,
}: Props<T>) {
  const [isProcessing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setFileName(file.name);

    if (file.size > maxMb * 1024 * 1024) {
      setError(`Archivo de ${(file.size / 1_048_576).toFixed(1)} MB excede el límite de ${maxMb} MB.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("archivo", file);

    startTransition(async () => {
      const res = await onProcess(formData);
      if (inputRef.current) inputRef.current.value = "";
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onExtracted(res.defaults);
      const conf = Math.round(res.meta.confidence * 100);
      const tiempo = res.meta.cache_hit
        ? "cache (instantáneo)"
        : `${res.meta.latencia_ms} ms`;
      const costo =
        res.meta.costo_usd > 0
          ? ` · $${res.meta.costo_usd.toFixed(4)} USD`
          : "";
      setSuccess(
        `Datos extraídos. Confianza ${conf}% · ${tiempo}${costo}. Revisa los campos del formulario y ajusta lo que la IA no leyó bien.`,
      );
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-accent/50 bg-accent/5 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-1 h-5 w-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          {fileName && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {fileName}
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
        >
          {isProcessing ? "Leyendo…" : "Cargar"}
        </Button>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
          {success}
        </p>
      )}
    </div>
  );
}
