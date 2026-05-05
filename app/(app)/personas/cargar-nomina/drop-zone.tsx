"use client";

import { Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { initialSubirNominaState } from "@/lib/nomina/state";

import { procesarLoteXmls } from "./actions";

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

export function CargarNominaDropZone({ empresas }: { empresas: Empresa[] }) {
  const [state, formAction] = useFormState(
    procesarLoteXmls,
    initialSubirNominaState,
  );
  const [archivos, setArchivos] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [empresaId, setEmpresaId] = useState<string>(empresas[0]?.id ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset archivos al éxito
  useEffect(() => {
    if (state.ok) setArchivos([]);
  }, [state.ok]);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    setArchivos((prev) => [...prev, ...files]);
  }
  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setArchivos((prev) => [...prev, ...files]);
    if (inputRef.current) inputRef.current.value = "";
  }
  function quitarArchivo(idx: number) {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalSize = archivos.reduce((acc, f) => acc + f.size, 0);
  const tooBig = totalSize > 50 * 1024 * 1024;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      {/* Hidden input con archivos para que el server action los reciba */}
      {/* No se puede pasar File[] a un Server Action vía useState directamente.
          Usamos un input file nativo controlado, vacío, y lo poblamos via
          DataTransfer cuando el form se envía. Workaround: usamos input file
          uncontrolled junto con drag & drop. */}
      <div className="space-y-2">
        <Label htmlFor="empresa_id">Empresa</Label>
        <select
          id="empresa_id"
          name="empresa_id"
          required
          value={empresaId}
          onChange={(e) => setEmpresaId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.codigo} — {e.nombre_comercial ?? e.razon_social}
            </option>
          ))}
        </select>
      </div>

      <label
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-bg-2 hover:border-primary/50"
        }`}
      >
        <Upload className="h-8 w-8 text-ink-3" />
        <p className="mt-2 text-sm font-medium">
          Arrastra .xml o .zip aquí, o haz click para seleccionar
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Acepta múltiples archivos. Total máximo: 50 MB.
        </p>
        <input
          ref={inputRef}
          name="archivos"
          type="file"
          multiple
          accept=".xml,.zip,application/xml,application/zip"
          onChange={onSelect}
          className="hidden"
        />
      </label>

      {archivos.length > 0 && (
        <div className="rounded-md border border-border bg-bg-2 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {archivos.length} archivo{archivos.length === 1 ? "" : "s"} ·{" "}
            {(totalSize / 1024).toFixed(1)} KB
            {tooBig && (
              <span className="ml-2 text-destructive">
                ⚠ Excede 50 MB — quita algunos.
              </span>
            )}
          </p>
          <ul className="space-y-1">
            {archivos.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <span>
                  📄 {f.name} ·{" "}
                  <span className="text-muted-foreground">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => quitarArchivo(i)}
                  className="text-destructive hover:underline"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {state.ok && state.uploadId && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          ✓ Lote procesado.{" "}
          <a
            href={`/personas/cargar-nomina/uploads/${state.uploadId}`}
            className="underline"
          >
            Ver detalle
          </a>
        </div>
      )}

      <SubmitBtn deshabilitado={archivos.length === 0 || tooBig} />
    </form>
  );
}

function SubmitBtn({ deshabilitado }: { deshabilitado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || deshabilitado}>
      {pending ? "Procesando…" : "Procesar lote"}
    </Button>
  );
}
