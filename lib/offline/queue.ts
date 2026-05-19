"use client";

/**
 * Cola de mutaciones offline para acciones de campo (bitácora, viáticos,
 * fotos, etc.) cuando el usuario está sin red.
 *
 * Diseño:
 * - Storage: IndexedDB (API nativa, sin libs). DB `erp_offline`, store `queue`.
 * - Cada entry: { id, kind, payload (FormData serializable o JSON),
 *                 createdAt, retries, lastError }.
 * - Procesador: `processQueue(handler)` itera la cola en orden y dispara
 *   `handler(entry)`. Si falla, incrementa `retries` y conserva.
 * - Drop: tras N reintentos sin éxito (default 5), marca el entry como
 *   "failed" pero NO lo borra — el usuario decide reintentar o descartar.
 *
 * Las acciones que usen la cola deben:
 * 1. Importar `enqueue(...)` y guardar la mutación si `!navigator.onLine`.
 * 2. Registrar su `handler(entry)` en el procesador (típicamente en un
 *    provider client que vive en el layout).
 *
 * No usamos workbox-background-sync porque queremos control fino sobre
 * el retry, el feedback al usuario y la observabilidad.
 */

const DB_NAME = "erp_offline";
const DB_VERSION = 1;
const STORE = "queue";

export type QueueEntryStatus = "pending" | "processing" | "failed";

export type QueueEntry<T = unknown> = {
  id: string;
  /** Identifica el handler que procesa este entry (ej. "bitacora.create"). */
  kind: string;
  /** Payload serializable. Si es FormData, serializarla a object antes. */
  payload: T;
  /** Etiqueta humana para mostrar en la UI ("Evento de bitácora — Proyecto X"). */
  label: string;
  createdAt: number;
  retries: number;
  status: QueueEntryStatus;
  lastError?: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB no disponible en este entorno"));
  }
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("Error al abrir IndexedDB"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("by_status", "status");
        store.createIndex("by_kind", "kind");
        store.createIndex("by_createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
  return dbPromise;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Encola una mutación. Retorna el id generado. */
export async function enqueue<T>(
  kind: string,
  payload: T,
  label: string,
): Promise<string> {
  const db = await openDb();
  const id = newId();
  const entry: QueueEntry<T> = {
    id,
    kind,
    payload,
    label,
    createdAt: Date.now(),
    retries: 0,
    status: "pending",
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notifyChange();
  return id;
}

/** Lista todas las entradas en la cola. */
export async function listEntries(): Promise<QueueEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueueEntry[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeEntry(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notifyChange();
}

async function updateEntry(entry: QueueEntry): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notifyChange();
}

/** Handler registrado por kind. Retorna ok/error como server actions. */
export type QueueHandler<T = unknown> = (
  entry: QueueEntry<T>,
) => Promise<{ ok: boolean; error: string | null }>;

const handlers = new Map<string, QueueHandler>();

export function registerHandler<T>(kind: string, handler: QueueHandler<T>): void {
  handlers.set(kind, handler as QueueHandler);
}

/** Procesa todas las entries pending en orden FIFO. Llama `onProgress` por entry. */
export async function processQueue(opts?: {
  maxRetries?: number;
  onProgress?: (entry: QueueEntry, result: "ok" | "retry" | "failed") => void;
}): Promise<{
  processed: number;
  failed: number;
  pending: number;
}> {
  const maxRetries = opts?.maxRetries ?? 5;
  const all = await listEntries();
  const pendingList = all
    .filter((e) => e.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt);

  let processed = 0;
  let failed = 0;

  for (const entry of pendingList) {
    const handler = handlers.get(entry.kind);
    if (!handler) {
      // Sin handler — dejarlo en cola, no contar como failed.
      continue;
    }
    await updateEntry({ ...entry, status: "processing" });
    let result: Awaited<ReturnType<QueueHandler>>;
    try {
      result = await handler(entry);
    } catch (e) {
      result = { ok: false, error: (e as Error).message };
    }
    if (result.ok) {
      await removeEntry(entry.id);
      processed += 1;
      opts?.onProgress?.(entry, "ok");
    } else {
      const retries = entry.retries + 1;
      const status: QueueEntryStatus = retries >= maxRetries ? "failed" : "pending";
      await updateEntry({
        ...entry,
        status,
        retries,
        lastError: result.error ?? "Error desconocido",
      });
      if (status === "failed") {
        failed += 1;
        opts?.onProgress?.(entry, "failed");
      } else {
        opts?.onProgress?.(entry, "retry");
      }
    }
  }

  const remaining = await listEntries();
  return {
    processed,
    failed,
    pending: remaining.filter((e) => e.status === "pending").length,
  };
}

/** Marca un entry "failed" como pending de nuevo (reset retries). */
export async function retryEntry(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result as QueueEntry | undefined;
      if (!entry) return resolve();
      store.put({ ...entry, status: "pending", retries: 0, lastError: undefined });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notifyChange();
}

// ============================================================================
// Listener para que la UI reaccione a cambios en la cola sin polling.
// ============================================================================

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeQueueChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyChange() {
  listeners.forEach((l) => l());
}
