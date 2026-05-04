"use client";

import { CalendarPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { initialGenerarAnualesState } from "@/lib/obligaciones/state";

import { generarObligacionesAnuales } from "./actions";

/**
 * Botón + modal para generar las obligaciones recurrentes (IVA, ISR, DIOT,
 * etc.) de un año completo para una empresa. Llama a la función SQL
 * `generar_obligaciones_anuales(empresa_id, anio)`.
 *
 * Idempotente: si ya existen, ON CONFLICT DO NOTHING en el stored proc.
 */
export function GenerarAnualesButton({
  empresas,
}: {
  empresas: Array<{ id: string; codigo: string; nombre: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(
    generarObligacionesAnuales,
    initialGenerarAnualesState,
  );
  const yearActual = new Date().getFullYear();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (empresas.length === 0) return null;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-3.5 w-3.5" />
        Generar año
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Generar obligaciones del año"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-lg">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-[13.5px] font-semibold">
                Generar obligaciones del año
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </header>
            <form action={formAction} className="space-y-3 p-4">
              <p className="text-[11.5px] text-ink-3">
                Crea las obligaciones recurrentes (IVA mensual, ISR provisional,
                ISR retenciones, DIOT) para la empresa y año seleccionados. Si
                ya existen, se omiten silenciosamente.
              </p>

              <div className="space-y-1">
                <Label htmlFor="ga_empresa" className="text-[11.5px]">
                  Empresa *
                </Label>
                <select
                  id="ga_empresa"
                  name="empresa_id"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">— Selecciona —</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.codigo} — {e.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="ga_anio" className="text-[11.5px]">
                  Año *
                </Label>
                <select
                  id="ga_anio"
                  name="anio"
                  defaultValue={String(yearActual)}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-mono"
                >
                  {[yearActual - 1, yearActual, yearActual + 1].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {state.error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
                  {state.error}
                </p>
              )}
              {state.ok && (
                <p className="rounded-md border border-emerald-300/40 bg-emerald-50 px-2 py-1.5 text-[11.5px] text-emerald-900">
                  Insertadas {state.insertados ?? 0} obligaciones (las
                  duplicadas se omitieron).
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  {state.ok ? "Cerrar" : "Cancelar"}
                </Button>
                {!state.ok && <Submit />}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Generando…" : "Generar"}
    </Button>
  );
}
