"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Singleton imperative `promptInput()` — drop-in replacement de
 * `window.prompt()`.
 *
 * Uso:
 *   import { promptInput } from "@/components/ui/prompt-input";
 *   const motivo = await promptInput({ message: "Motivo de rechazo", minLength: 5 });
 *   if (!motivo) return;
 *
 * Requiere `<PromptInputHost />` montado UNA SOLA VEZ en RootLayout.
 *
 * Notas:
 * - Retorna `null` si el usuario cancela (ESC, click fuera, botón Cancelar).
 * - `minLength` valida en cliente antes de resolver — si no cumple, no cierra.
 * - Si quieres permitir vacío, no pongas `minLength`.
 */

export type PromptInputOptions = {
  title?: string;
  message: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  /** Texto del botón confirmar. Default: "Aceptar". */
  confirmLabel?: string;
  /** Texto del botón cancelar. Default: "Cancelar". */
  cancelLabel?: string;
  /** Validación: longitud mínima. */
  minLength?: number;
  /** Type del input. Default: "text". */
  type?: "text" | "number" | "email" | "url";
  /** Si el input es multilínea (textarea). */
  multiline?: boolean;
};

type Listener = (
  opts: PromptInputOptions,
  resolve: (value: string | null) => void,
) => void;

let listener: Listener | null = null;

export function promptInput(
  opts: PromptInputOptions,
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!listener) {
      // Fallback: si no hay host, usa window.prompt para no dejar al usuario
      // colgado. No debería pasar en prod.
      if (typeof window !== "undefined") {
        const r = window.prompt(opts.message, opts.defaultValue ?? "");
        resolve(r);
      } else {
        resolve(null);
      }
      return;
    }
    listener(opts, resolve);
  });
}

/** Host singleton — montar UNA SOLA VEZ en el RootLayout. */
export function PromptInputHost() {
  const [state, setState] = useState<{
    opts: PromptInputOptions;
    resolve: (v: string | null) => void;
  } | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );

  useEffect(() => {
    listener = (opts, resolve) => {
      setValue(opts.defaultValue ?? "");
      setError(null);
      setState({ opts, resolve });
    };
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    // Autofocus al primer render — esperar un tick a que el input se monte.
    const t = setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current && state.opts.defaultValue) {
        inputRef.current.select();
      }
    }, 30);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && !state.opts.multiline) {
        e.preventDefault();
        onConfirm();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, value]);

  if (!state) return null;
  const { opts, resolve } = state;

  function onCancel() {
    resolve(null);
    setState(null);
    setValue("");
    setError(null);
  }

  function onConfirm() {
    const trimmed = value.trim();
    if (opts.minLength && trimmed.length < opts.minLength) {
      setError(`Mínimo ${opts.minLength} caracteres.`);
      return;
    }
    resolve(trimmed);
    setState(null);
    setValue("");
    setError(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-input-title"
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl">
        <h3
          id="prompt-input-title"
          className="text-[14px] font-semibold leading-tight"
        >
          {opts.title ?? "Captura"}
        </h3>
        <p className="mt-1.5 whitespace-pre-line text-[13px] text-ink-2">
          {opts.message}
        </p>
        <div className="mt-3 space-y-1.5">
          {opts.label && (
            <Label htmlFor="prompt-input-field" className="text-[12px]">
              {opts.label}
            </Label>
          )}
          {opts.multiline ? (
            <textarea
              id="prompt-input-field"
              ref={(el) => {
                inputRef.current = el;
              }}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder={opts.placeholder}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          ) : (
            <Input
              id="prompt-input-field"
              ref={(el) => {
                inputRef.current = el;
              }}
              type={opts.type ?? "text"}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder={opts.placeholder}
              className="text-sm"
            />
          )}
          {error && (
            <p className="text-[11.5px] text-destructive">{error}</p>
          )}
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
          <Button type="button" size="sm" onClick={onConfirm}>
            {opts.confirmLabel ?? "Aceptar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
