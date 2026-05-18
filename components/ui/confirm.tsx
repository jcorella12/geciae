"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Singleton imperative `confirm()` — drop-in replacement de `window.confirm()`.
 *
 * Uso:
 *   import { confirm } from "@/components/ui/confirm";
 *   if (!(await confirm("¿Eliminar tarea?"))) return;
 *   if (!(await confirm({ message: "...", danger: true, title: "Eliminar" }))) return;
 *
 * Requiere montar `<ConfirmHost />` en el RootLayout (una sola vez).
 *
 * Por qué este patrón:
 *  - `window.confirm()` bloquea el thread y no respeta el theme/UX.
 *  - Una API imperativa (no provider) hace que la migración desde
 *    `confirm()` sea agregar `await` y nada más, sin refactor masivo
 *    de cada handler.
 */

export type ConfirmOptions = {
  title?: string;
  message: string;
  /** Estilo destructivo (botón rojo, ícono warning). Default: false */
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
};

type Listener = (
  opts: ConfirmOptions,
  resolve: (v: boolean) => void,
) => void;

let listener: Listener | null = null;

export function confirm(
  optsOrMessage: ConfirmOptions | string,
): Promise<boolean> {
  const opts: ConfirmOptions =
    typeof optsOrMessage === "string"
      ? { message: optsOrMessage }
      : optsOrMessage;

  return new Promise((resolve) => {
    if (!listener) {
      // Fallback: si nadie montó el host, usa window.confirm para no
      // dejar al usuario colgado. No debería pasar en prod.
      if (typeof window !== "undefined") {
        resolve(window.confirm(opts.message));
      } else {
        resolve(false);
      }
      return;
    }
    listener(opts, resolve);
  });
}

/** Host singleton — montar UNA SOLA VEZ en el RootLayout. */
export function ConfirmHost() {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  useEffect(() => {
    listener = (opts, resolve) => setState({ opts, resolve });
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) return null;

  const { opts, resolve } = state;

  function onCancel() {
    resolve(false);
    setState(null);
  }
  function onConfirm() {
    resolve(true);
    setState(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start gap-3">
          {opts.danger && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1">
            <h3
              id="confirm-title"
              className="text-[14px] font-semibold leading-tight"
            >
              {opts.title ?? (opts.danger ? "Confirmar acción" : "Confirmar")}
            </h3>
            <p className="mt-1.5 whitespace-pre-line text-[13px] text-ink-2">
              {opts.message}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            {opts.cancelLabel ?? "Cancelar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={opts.danger ? "destructive" : "default"}
            onClick={onConfirm}
            autoFocus
          >
            {opts.confirmLabel ?? (opts.danger ? "Eliminar" : "Confirmar")}
          </Button>
        </div>
      </div>
    </div>
  );
}
