"use client";

import { useEffect } from "react";

import { registrarEventoBitacora } from "@/app/(app)/proyectos/[id]/bitacora/actions";
import { registerHandler, type QueueEntry } from "@/lib/offline/queue";

/**
 * Registra los handlers que procesan las mutaciones offline cuando vuelve
 * la red. Se monta UNA VEZ en el AppLayout — los handlers viven mientras
 * el usuario esté logueado.
 *
 * Cada handler recibe el `payload` que se encoló (objeto serializable
 * que reproduce los inputs del form), reconstruye un FormData y llama
 * a la server action correspondiente.
 *
 * Para agregar una nueva action al sistema offline:
 * 1. En el form: importa `enqueue` y, si !online, encola con un `kind`
 *    único (ej. "viaticos.create") y el payload (objeto plano).
 * 2. Aquí: agrega un `registerHandler(kind, async (entry) => ...)` que
 *    reconstruye FormData del payload y llama a la server action.
 */
type BitacoraPayload = {
  proyecto_id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  tarea_id?: string;
  es_critica: boolean;
  visible_cliente: boolean;
};

function payloadToFormData(payload: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") {
      if (v) fd.set(k, "on");
    } else {
      fd.set(k, String(v));
    }
  }
  return fd;
}

export function OfflineHandlers() {
  useEffect(() => {
    // ----- Bitácora -----
    registerHandler<BitacoraPayload>(
      "bitacora.create",
      async (entry: QueueEntry<BitacoraPayload>) => {
        const fd = payloadToFormData(entry.payload as Record<string, unknown>);
        const r = await registrarEventoBitacora(
          { ok: false, error: null },
          fd,
        );
        return { ok: !!r.ok, error: r.error ?? null };
      },
    );

    // Agregar más handlers acá (viáticos, fotos, etc.)
  }, []);

  return null;
}
