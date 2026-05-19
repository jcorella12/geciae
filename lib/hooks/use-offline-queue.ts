"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listEntries,
  processQueue,
  subscribeQueueChanges,
  type QueueEntry,
} from "@/lib/offline/queue";

import { useOnline } from "./use-online";

/**
 * Estado en tiempo real de la cola offline + procesamiento automático
 * cuando vuelve la red.
 *
 * Uso típico en un layout/provider:
 * ```tsx
 * const { pending, failed, syncing, sync } = useOfflineQueue();
 * ```
 */
export function useOfflineQueue(): {
  /** Total de entries (pending + processing + failed). */
  total: number;
  pending: number;
  failed: number;
  syncing: boolean;
  /** Snapshot de entries para mostrar lista detallada (opcional). */
  entries: QueueEntry[];
  /** Fuerza sync manual. */
  sync: () => Promise<void>;
} {
  const online = useOnline();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const all = await listEntries();
      setEntries(all);
    } catch {
      // IndexedDB no disponible (private mode, etc.) — silenciar.
      setEntries([]);
    }
  }, []);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await processQueue();
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [syncing, refresh]);

  // Carga inicial.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Suscribirse a cambios de la cola.
  useEffect(() => {
    const unsub = subscribeQueueChanges(() => {
      void refresh();
    });
    return unsub;
  }, [refresh]);

  // Cuando volvemos online y hay pending → autosync.
  useEffect(() => {
    if (!online) return;
    const pending = entries.filter((e) => e.status === "pending").length;
    if (pending > 0 && !syncing) {
      void sync();
    }
    // No agregar `sync` a deps porque cambia cada render; ok porque el effect
    // se dispara cuando cambia `online` o `entries`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, entries]);

  const pending = entries.filter((e) => e.status === "pending").length;
  const failed = entries.filter((e) => e.status === "failed").length;

  return {
    total: entries.length,
    pending,
    failed,
    syncing,
    entries,
    sync,
  };
}
