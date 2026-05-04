"use client";

import { FileText, Upload, X, Sparkles, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useTransition, type DragEvent } from "react";

import { Button } from "@/components/ui/button";

import {
  extraerSaldoEdocuentaIA,
  procesarExpFile,
  subirArchivoEdocta,
} from "./actions";

type FileStatus = {
  filename: string;
  formato: "pdf" | "exp";
  estadoId: string;
  status: "uploaded" | "processing" | "done" | "error";
  message?: string;
};

/**
 * Drag-and-drop uploader for bank statements (.pdf monthly + .exp daily BBVA).
 *
 * Flow:
 *  1. User drops or selects file(s)
 *  2. Each file is uploaded to bucket and a row created in estados_cuenta_bancarios
 *  3. After upload, action button appears:
 *     - PDF: "Leer con IA" → calls extraerSaldoEdocuentaIA (Claude vision)
 *     - .exp: "Procesar movimientos" → calls procesarExpFile (TS-side parser, free)
 */
export function EdoctaUploader({ cuentaId }: { cuentaId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (dropped.length > 0) procesarUploads(dropped);
  }
  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) procesarUploads(selected);
    // Reset para permitir seleccionar mismo archivo después
    if (inputRef.current) inputRef.current.value = "";
  }

  function procesarUploads(toUpload: File[]) {
    setGlobalError(null);
    startTransition(async () => {
      for (const file of toUpload) {
        const fd = new FormData();
        fd.append("file", file);
        const r = await subirArchivoEdocta(cuentaId, fd);
        if (r.ok && r.estadoId && r.formato) {
          setFiles((prev) => [
            ...prev,
            {
              filename: r.filename ?? file.name,
              formato: r.formato!,
              estadoId: r.estadoId!,
              status: "uploaded",
            },
          ]);
        } else {
          setGlobalError(r.error ?? `Error al subir ${file.name}`);
        }
      }
      router.refresh();
    });
  }

  function procesarConIA(estadoId: string) {
    setFiles((prev) =>
      prev.map((f) =>
        f.estadoId === estadoId ? { ...f, status: "processing" } : f,
      ),
    );
    startTransition(async () => {
      const r = await extraerSaldoEdocuentaIA(estadoId);
      setFiles((prev) =>
        prev.map((f) =>
          f.estadoId === estadoId
            ? {
                ...f,
                status: r.ok ? "done" : "error",
                message: r.ok
                  ? `✓ Saldo $${(r.saldo_final ?? 0).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}${r.num_movs ? ` · ${r.num_movs} movs` : ""}`
                  : r.error ?? "Error",
              }
            : f,
        ),
      );
      router.refresh();
    });
  }

  function procesarExp(estadoId: string) {
    setFiles((prev) =>
      prev.map((f) =>
        f.estadoId === estadoId ? { ...f, status: "processing" } : f,
      ),
    );
    startTransition(async () => {
      const r = await procesarExpFile(estadoId);
      setFiles((prev) =>
        prev.map((f) =>
          f.estadoId === estadoId
            ? {
                ...f,
                status: r.ok ? "done" : "error",
                message: r.ok
                  ? `✓ ${r.movs_insertados} movs · saldo $${(r.saldo_final ?? 0).toLocaleString(
                      "es-MX",
                      { minimumFractionDigits: 2 },
                    )}`
                  : r.error ?? "Error",
              }
            : f,
        ),
      );
      router.refresh();
    });
  }

  function quitar(estadoId: string) {
    setFiles((prev) => prev.filter((f) => f.estadoId !== estadoId));
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed transition ${
          dragOver
            ? "border-violet-400 bg-violet-50"
            : "border-border bg-card hover:bg-bg-2"
        } px-4 py-6 text-center`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.exp,.tsv,.txt,application/pdf,text/plain"
          multiple
          onChange={handleSelect}
          className="hidden"
        />
        <Upload className="mx-auto mb-2 h-5 w-5 text-ink-3" />
        <p className="text-sm font-medium">
          Arrastra archivos aquí o haz clic para seleccionar
        </p>
        <p className="mt-1 text-[11px] text-ink-3">
          <strong>.pdf</strong> (estado de cuenta mensual) ·{" "}
          <strong>.exp</strong> (movimientos diarios BBVA, formato TSV)
        </p>
        {isPending && (
          <p className="mt-2 text-[11px] text-violet-700">Subiendo…</p>
        )}
      </div>

      {globalError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {globalError}
        </div>
      )}

      {/* Lista de archivos subidos en esta sesión */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div
              key={f.estadoId}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <FileText className="h-4 w-4 text-ink-3" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{f.filename}</p>
                {f.message && (
                  <p
                    className={`text-[11px] ${
                      f.status === "error"
                        ? "text-destructive"
                        : "text-emerald-700"
                    }`}
                  >
                    {f.message}
                  </p>
                )}
              </div>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  f.formato === "pdf"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {f.formato.toUpperCase()}
              </span>
              {f.status === "uploaded" &&
                (f.formato === "pdf" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => procesarConIA(f.estadoId)}
                    disabled={isPending}
                  >
                    <Sparkles className="h-3 w-3" />
                    Leer con IA
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => procesarExp(f.estadoId)}
                    disabled={isPending}
                  >
                    <Database className="h-3 w-3" />
                    Procesar .exp
                  </Button>
                ))}
              {f.status === "processing" && (
                <span className="text-[11px] text-violet-700">
                  Procesando…
                </span>
              )}
              {f.status === "done" && (
                <span className="text-[11px] text-emerald-700">✓ Listo</span>
              )}
              <button
                type="button"
                onClick={() => quitar(f.estadoId)}
                className="text-ink-4 hover:text-ink-1"
                title="Quitar de la lista (no borra del bucket)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
