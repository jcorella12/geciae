"use client";

import { Lightbulb, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CATEGORIAS,
  ETIQUETA_CATEGORIA,
  initialCrearSugerenciaState,
  type CategoriaSugerencia,
} from "@/lib/sugerencias/state";

import { crearSugerencia } from "@/app/(app)/admin/sugerencias/actions";

/**
 * Botón global "Sugerir mejora".
 *
 * Vive en el topbar y abre un modal pequeño con categoría + descripción.
 * Captura automáticamente la URL actual y el user agent para dar contexto
 * al CEO al revisar.
 *
 * Diseño minimalista: discreto en topbar, no flotante (más ligero, no
 * tapa contenido). El CEO puede actuar desde /admin/sugerencias.
 */
export function SugerirMejoraButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title="Sugerir mejora"
        aria-label="Sugerir mejora"
        className="text-ink-3 hover:text-ink-1"
      >
        <Lightbulb className="h-4 w-4" />
      </Button>
      {open && <SugerirModal onClose={() => setOpen(false)} />}
    </>
  );
}

function SugerirModal({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [state, formAction] = useFormState(
    crearSugerencia,
    initialCrearSugerenciaState,
  );
  const [showOk, setShowOk] = useState(false);
  const [categoria, setCategoria] =
    useState<CategoriaSugerencia>("mejora_ux");
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    if (state.ok) {
      setShowOk(true);
      // Auto-cierre después de 2s
      const t = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [state.ok, onClose]);

  // Escape para cerrar + body lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sugerir mejora"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-lg">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <h3 className="text-[13.5px] font-semibold">Sugerir mejora</h3>
          </div>
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

        {showOk ? (
          <div className="p-6 text-center">
            <p className="text-[14px] font-medium text-emerald-700">
              ¡Gracias por tu sugerencia!
            </p>
            <p className="mt-1 text-[12px] text-ink-3">
              La revisamos en /admin/sugerencias.
            </p>
          </div>
        ) : (
          <form action={formAction} className="space-y-3 p-4">
            <input
              type="hidden"
              name="url_contexto"
              value={
                typeof window !== "undefined"
                  ? `${window.location.origin}${pathname ?? ""}`
                  : (pathname ?? "")
              }
            />
            <input
              type="hidden"
              name="user_agent"
              value={
                typeof window !== "undefined"
                  ? navigator.userAgent.slice(0, 500)
                  : ""
              }
            />

            <p className="text-[11.5px] text-ink-3">
              ¿Detectaste fricción, un bug o tienes una idea? Cuéntanos. Tu
              sugerencia llega al CEO.
            </p>

            <div className="space-y-1">
              <Label htmlFor="sm_cat" className="text-[11.5px]">
                Categoría *
              </Label>
              <select
                id="sm_cat"
                name="categoria"
                value={categoria}
                onChange={(e) =>
                  setCategoria(e.target.value as CategoriaSugerencia)
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {ETIQUETA_CATEGORIA[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="sm_desc" className="text-[11.5px]">
                Descripción *
              </Label>
              <textarea
                id="sm_desc"
                name="descripcion"
                rows={5}
                required
                minLength={10}
                maxLength={4000}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={
                  categoria === "bug"
                    ? "Qué pasó, qué esperabas, pasos para reproducir."
                    : categoria === "feature_nuevo"
                      ? "Qué te gustaría poder hacer, qué problema resolvería."
                      : "Sé específico: dónde, qué pasó, qué cambiarías."
                }
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-[12.5px]"
              />
              <p className="text-[10.5px] text-ink-4">
                {descripcion.length}/4000 caracteres · contexto: {pathname}
              </p>
            </div>

            {state.error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
                {state.error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <SubmitBtn />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Enviando…" : "Enviar sugerencia"}
    </Button>
  );
}
