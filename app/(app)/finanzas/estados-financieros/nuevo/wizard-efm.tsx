"use client";

import { CheckCircle2, FileQuestion, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clasificarDocumento } from "@/lib/efm/clasificador";
import {
  ETIQUETA_TIPO_DOC,
  MESES_ES,
  TIPOS_DOC_EFM,
  type TipoDocEFM,
} from "@/lib/efm/state";
import { cn } from "@/lib/utils";

import { crearPaqueteMensual, subirDocumentos } from "../actions";

type ClasificacionFila = {
  file: File;
  tipo: TipoDocEFM | null;
};

/**
 * Wizard cliente: paso 1 selecciona empresa+año+mes, paso 2 drag&drop
 * multi-archivo con clasificación automática + override manual, paso 3
 * sube y deja el paquete creado en /estados-financieros/{efmId}.
 */
export function WizardEFM({
  empresas,
}: {
  empresas: Array<{ id: string; codigo: string; nombre: string }>;
}) {
  const router = useRouter();
  const today = new Date();
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "");
  const [anio, setAnio] = useState(today.getFullYear());
  const [mes, setMes] = useState(today.getMonth() + 1); // mes actual
  const [filas, setFilas] = useState<ClasificacionFila[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSelectFiles = (filesList: FileList | null) => {
    if (!filesList) return;
    const arr = Array.from(filesList).map((file) => ({
      file,
      tipo: clasificarDocumento(file.name),
    }));
    setFilas((prev) => [...prev, ...arr]);
  };

  const removerFila = (idx: number) => {
    setFilas((prev) => prev.filter((_, i) => i !== idx));
  };

  const cambiarTipo = (idx: number, tipo: TipoDocEFM | null) => {
    setFilas((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, tipo } : f)),
    );
  };

  const reconocidos = useMemo(
    () => filas.filter((f) => f.tipo !== null).length,
    [filas],
  );

  const tiposDuplicados = useMemo(() => {
    const cnt = new Map<TipoDocEFM, number>();
    for (const f of filas) {
      if (f.tipo) cnt.set(f.tipo, (cnt.get(f.tipo) ?? 0) + 1);
    }
    return Array.from(cnt.entries())
      .filter(([, n]) => n > 1)
      .map(([t]) => t);
  }, [filas]);

  const onSubmit = () => {
    setError(null);
    if (!empresaId)
      return setError("Selecciona empresa.");
    if (filas.length === 0)
      return setError("Selecciona al menos un archivo.");
    if (tiposDuplicados.length > 0)
      return setError(
        `Hay tipos repetidos: ${tiposDuplicados.join(", ")}. Cada tipo debe tener máximo un archivo.`,
      );

    startTransition(async () => {
      // 1. Crear paquete (idempotente — devuelve el existente si ya hay).
      const fdCrear = new FormData();
      fdCrear.set("empresa_id", empresaId);
      fdCrear.set("anio", String(anio));
      fdCrear.set("mes", String(mes));
      const resCrear = await crearPaqueteMensual(
        { ok: false, error: null },
        fdCrear,
      );
      if (!resCrear.ok || !resCrear.efmId) {
        setError(resCrear.error ?? "No se pudo crear paquete.");
        return;
      }

      // 2. Subir solo los archivos clasificados (con renombrado al tipo)
      const fdUpload = new FormData();
      fdUpload.set("efm_id", resCrear.efmId);
      const conTipo = filas.filter((f) => f.tipo !== null);
      if (conTipo.length === 0) {
        setError(
          "Ningún archivo tiene tipo asignado. Asigna tipos antes de subir.",
        );
        return;
      }
      for (const f of conTipo) {
        // Re-empaquetar el File con un nombre que incluya el tipo, para que el
        // clasificador server-side lo detecte correctamente. Esto es robusto
        // ante override manual en el cliente.
        const renamed = new File([f.file], `${f.tipo}.pdf`, {
          type: f.file.type || "application/pdf",
        });
        fdUpload.append("archivos", renamed);
      }
      const resSubir = await subirDocumentos(
        { ok: false, error: null },
        fdUpload,
      );
      if (!resSubir.ok) {
        setError(resSubir.error ?? "Error al subir.");
        return;
      }

      router.push(`/finanzas/estados-financieros/${resCrear.efmId}`);
    });
  };

  return (
    <div className="space-y-5">
      {/* Paso 1: empresa + periodo */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[13.5px] font-semibold">1. Periodo</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1">
            <Label htmlFor="w_empresa" className="text-[11.5px]">
              Empresa *
            </Label>
            <select
              id="w_empresa"
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} — {e.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="w_anio" className="text-[11.5px]">
              Año
            </Label>
            <select
              id="w_anio"
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value, 10))}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-mono"
            >
              {[anio - 2, anio - 1, anio].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="w_mes" className="text-[11.5px]">
              Mes
            </Label>
            <select
              id="w_mes"
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value, 10))}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {MESES_ES.map((nombre, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Paso 2: archivos */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[13.5px] font-semibold">2. Archivos del paquete</h2>
        <p className="mt-1 text-[11.5px] text-ink-3">
          Arrastra los PDFs del despacho. Reconocidos:{" "}
          <strong>{reconocidos}</strong> de {filas.length}.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            onSelectFiles(e.dataTransfer.files);
          }}
          className={cn(
            "mt-3 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors",
            isDragging
              ? "border-brand bg-brand/5"
              : "border-border bg-bg-2/30",
          )}
        >
          <Upload className="mx-auto h-6 w-6 text-ink-3" />
          <p className="mt-2 text-[12.5px]">
            Arrastra archivos aquí o
          </p>
          <Input
            type="file"
            multiple
            accept="application/pdf"
            onChange={(e) => onSelectFiles(e.target.files)}
            className="mx-auto mt-2 max-w-xs h-8 file:mr-2 file:rounded file:border-0 file:bg-bg-2 file:px-2 file:py-1 file:text-[11px]"
          />
        </div>

        {filas.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {filas.map((f, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 rounded-md border border-border bg-bg-2/40 px-3 py-2 text-[12px]"
              >
                {f.tipo ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                ) : (
                  <FileQuestion className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                )}
                <span className="flex-1 truncate">{f.file.name}</span>
                <select
                  value={f.tipo ?? ""}
                  onChange={(e) =>
                    cambiarTipo(
                      idx,
                      (e.target.value as TipoDocEFM) || null,
                    )
                  }
                  className="h-7 rounded border border-border bg-card px-1.5 text-[11px]"
                >
                  <option value="">— Sin clasificar —</option>
                  {TIPOS_DOC_EFM.map((t) => (
                    <option key={t} value={t}>
                      {ETIQUETA_TIPO_DOC[t]}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removerFila(idx)}
                  aria-label="Quitar"
                  className="h-7 px-1.5"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {tiposDuplicados.length > 0 && (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11.5px] text-amber-800">
            Tipos repetidos: {tiposDuplicados.join(", ")}. Cada tipo solo puede
            tener un archivo.
          </p>
        )}
      </section>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={
            isPending ||
            filas.length === 0 ||
            !empresaId ||
            tiposDuplicados.length > 0
          }
        >
          {isPending ? "Subiendo…" : "Crear paquete y subir"}
        </Button>
      </div>
    </div>
  );
}
