"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Singleton imperative `notify()` — drop-in replacement de `window.alert()`.
 *
 * Es un toast (non-blocking) en la esquina superior derecha que se
 * auto-cierra a los 5s. No bloquea el thread como `alert()`.
 *
 * Uso:
 *   import { notify } from "@/components/ui/notify";
 *   notify("Movimiento eliminado");
 *   notify({ message: "Error al guardar", variant: "error" });
 *   notify({ message: "...", variant: "success", title: "Listo" });
 *
 * Requiere montar `<NotifyHost />` UNA SOLA VEZ en RootLayout.
 */

export type NotifyVariant = "default" | "success" | "error" | "warning";

export type NotifyOptions = {
  title?: string;
  message: string;
  variant?: NotifyVariant;
  /** Auto-dismiss en ms. Default: 5000. Pasa 0 para no auto-cerrar. */
  duration?: number;
};

type ToastItem = NotifyOptions & { id: string };
type Listener = (item: ToastItem) => void;

let listener: Listener | null = null;
let counter = 0;

export function notify(optsOrMessage: NotifyOptions | string): void {
  const opts: NotifyOptions =
    typeof optsOrMessage === "string"
      ? { message: optsOrMessage }
      : optsOrMessage;

  if (!listener) {
    // Fallback: si no hay host montado, log a console (no usar window.alert
    // para no bloquear el thread).
    // eslint-disable-next-line no-console
    console.warn("[notify] ConfirmHost no montado:", opts.message);
    return;
  }
  const id = `n${++counter}-${Date.now()}`;
  listener({ ...opts, id });
}

const VARIANT_STYLE: Record<NotifyVariant, string> = {
  default: "border-border bg-card text-ink-1",
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100",
  error:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100",
  warning:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100",
};

const VARIANT_ICON: Record<NotifyVariant, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

/** Host singleton — montar UNA SOLA VEZ en el RootLayout. */
export function NotifyHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    listener = (item) => {
      setItems((prev) => [...prev, item]);
      const duration = item.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          setItems((prev) => prev.filter((x) => x.id !== item.id));
        }, duration);
      }
    };
    return () => {
      listener = null;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notificaciones"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[300] flex w-[min(420px,calc(100vw-32px))] flex-col gap-2"
    >
      {items.map((item) => {
        const v = item.variant ?? "default";
        const Icon = VARIANT_ICON[v];
        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] shadow-lg ${VARIANT_STYLE[v]}`}
          >
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="flex-1">
              {item.title && (
                <p className="text-[13px] font-semibold leading-tight">
                  {item.title}
                </p>
              )}
              <p className="whitespace-pre-line text-[12.5px] leading-snug">
                {item.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => prev.filter((x) => x.id !== item.id))
              }
              aria-label="Cerrar"
              className="ml-1 rounded p-0.5 text-current opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
