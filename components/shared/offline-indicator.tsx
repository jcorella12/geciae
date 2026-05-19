"use client";

import { CloudOff, RefreshCw, WifiOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { notify } from "@/components/ui/notify";
import { useOfflineQueue } from "@/lib/hooks/use-offline-queue";
import { useOnline } from "@/lib/hooks/use-online";
import { removeEntry, retryEntry } from "@/lib/offline/queue";

/**
 * Pildora compacta para el topbar. Muestra:
 *  - Offline: ícono rojo "Sin conexión" si !navigator.onLine
 *  - Pendientes: badge ámbar con N pendientes de sincronizar
 *  - Fallidos: badge rojo con N que no se pudieron sincronizar tras varios intentos
 *
 * Click abre un popover con lista detallada y botón "Reintentar todo" / por-entry.
 *
 * Si online + sin pendientes/fallidos, NO renderiza nada (sin ruido).
 */
export function OfflineIndicator() {
  const online = useOnline();
  const { pending, failed, syncing, entries, sync } = useOfflineQueue();
  const [open, setOpen] = useState(false);

  const showOffline = !online;
  const showQueue = pending > 0 || failed > 0;

  if (!showOffline && !showQueue) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11.5px] font-medium transition ${
          showOffline
            ? "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100"
            : failed > 0
              ? "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950"
              : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950"
        }`}
        title={
          showOffline
            ? "Sin conexión a internet"
            : `${pending} pendientes${failed > 0 ? `, ${failed} con error` : ""}`
        }
      >
        {showOffline ? (
          <WifiOff className="h-3 w-3" />
        ) : (
          <CloudOff className="h-3 w-3" />
        )}
        {showOffline && <span className="hidden md:inline">Sin conexión</span>}
        {pending > 0 && (
          <span className="rounded-full bg-current/20 px-1.5 py-px text-[10px]">
            {pending}
          </span>
        )}
        {failed > 0 && (
          <span className="rounded-full bg-red-600 px-1.5 py-px text-[10px] text-white">
            ✕ {failed}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30"
          />
          <div className="absolute right-0 top-9 z-40 w-[min(420px,calc(100vw-32px))] rounded-md border border-border bg-card p-3 shadow-lg">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-semibold leading-tight">
                  {showOffline
                    ? "Estás trabajando sin conexión"
                    : "Cambios pendientes de sincronizar"}
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {showOffline
                    ? "Tus cambios se guardan localmente y se enviarán cuando vuelva la red."
                    : "Estos cambios se hicieron offline y aún no llegan al servidor."}
                </p>
              </div>
              {online && pending > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void sync()}
                  disabled={syncing}
                  className="shrink-0"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`}
                  />
                  Sincronizar
                </Button>
              )}
            </div>

            {entries.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-4 text-center text-[11.5px] text-muted-foreground">
                Sin pendientes.
              </p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {entries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-border bg-background p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium">
                        {e.label}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString("es-MX")} ·{" "}
                        {e.kind}
                        {e.retries > 0 && ` · ${e.retries} intento(s)`}
                      </p>
                      {e.status === "failed" && e.lastError && (
                        <p className="mt-0.5 text-[10.5px] text-red-700">
                          {e.lastError}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {e.status === "failed" && online && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await retryEntry(e.id);
                            void sync();
                          }}
                          className="h-7 px-2 text-[11px]"
                        >
                          Reintentar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (
                            !(await confirm({
                              message: `¿Descartar "${e.label}"? El cambio se perderá.`,
                              danger: true,
                              confirmLabel: "Descartar",
                            }))
                          )
                            return;
                          await removeEntry(e.id);
                          notify("Cambio descartado.");
                        }}
                        aria-label="Descartar"
                        className="h-7 w-7 p-0 text-destructive"
                      >
                        ✕
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
