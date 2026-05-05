"use client";

import { Fuel, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";

import { Button } from "@/components/ui/button";

import {
  procesarReporteGasolina,
  type ResultadoProcesarReporte,
} from "./reporte-gasolina-actions";

/**
 * Botón + modal con drag&drop para subir el PDF mensual del reporte de
 * consumo de gasolina (formato El Faro u otra estación). Detecta empresa
 * por contenido, hace match por placas con la flota, e inserta cada carga
 * en vehiculos_bitacora.
 */
export function SubirReporteGasolinaButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Fuel className="h-4 w-4" />
        Cargar reporte gasolina
      </Button>
      {open && <Modal onClose={() => setOpen(false)} />}
    </>
  );
}

function Modal({ onClose }: { onClose: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoProcesarReporte | null>(
    null,
  );
  const [errorGen, setErrorGen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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
    const f = e.dataTransfer.files?.[0];
    if (f) setArchivo(f);
  }
  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setArchivo(f);
    if (inputRef.current) inputRef.current.value = "";
  }

  function procesar() {
    if (!archivo) return;
    setErrorGen(null);
    setResultado(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", archivo);
      const r = await procesarReporteGasolina(fd);
      setResultado(r);
      if (!r.ok) setErrorGen(r.error);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Subir reporte de gasolina"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-lg">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-[13.5px] font-semibold">
            Cargar reporte mensual de gasolina
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            Sube el PDF mensual de la estación (El Faro u otra). Se detecta
            automáticamente la empresa, se hacen match las placas con tu flota
            y se inserta cada carga en la bitácora del vehículo. Re-subir el
            mismo mes reemplaza las cargas previas.
          </p>

          {!resultado?.ok && (
            <>
              <label
                onDragEnter={handleDragEnter}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-8 text-center transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-bg-2 hover:border-primary/50"
                }`}
              >
                <Upload className="h-8 w-8 text-ink-3" />
                <p className="mt-2 text-sm font-medium">
                  Arrastra el PDF aquí o haz click para seleccionarlo
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Máximo 10 MB. Formato esperado: reporte mensual de consumo
                  con placas, fecha, litros, importe.
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleSelect}
                  className="hidden"
                />
              </label>

              {archivo && (
                <div className="flex items-center justify-between rounded-md border border-border bg-bg-2 px-3 py-2 text-sm">
                  <span>
                    📄 <strong>{archivo.name}</strong> ·{" "}
                    {(archivo.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => setArchivo(null)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              )}

              {errorGen && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorGen}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={procesar} disabled={!archivo || pending}>
                  {pending ? "Procesando…" : "Procesar PDF"}
                </Button>
              </div>
            </>
          )}

          {resultado?.ok && (
            <div className="space-y-3">
              <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-900">
                  ✓ Reporte procesado · {resultado.empresaCodigo}{" "}
                  {resultado.periodo}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-emerald-800">
                  <li>
                    Cargas extraídas del PDF:{" "}
                    <strong>{resultado.cargas_extraidas}</strong>
                  </li>
                  <li>
                    Cargas insertadas en bitácora:{" "}
                    <strong>{resultado.cargas_insertadas}</strong>
                  </li>
                  <li>
                    Vehículos actualizados:{" "}
                    <strong>{resultado.vehiculos_actualizados}</strong>
                  </li>
                </ul>
              </div>

              {resultado.cargas_sin_match.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900">
                    Sin match ({resultado.cargas_sin_match.length})
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    Estas placas no se encuentran en la flota — agrega los
                    vehículos en /activos/vehiculos/nuevo y vuelve a subir el
                    PDF.
                  </p>
                  <ul className="mt-2 max-h-40 overflow-y-auto text-xs">
                    {resultado.cargas_sin_match.map((s, i) => (
                      <li key={i} className="font-mono">
                        {s.placas} · {s.fecha} · ${s.importe.toFixed(2)}
                        {s.alias && ` · ${s.alias}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={onClose}>Cerrar</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
