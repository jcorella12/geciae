"use client";

import { useEffect } from "react";

import { completarPaso } from "@/app/(app)/comercial/levantamientos/actions";
import { crearViatico } from "@/app/(app)/personas/[id]/actions";
import { registrarEventoBitacora } from "@/app/(app)/proyectos/[id]/bitacora/actions";
import { crearReporte } from "@/app/(app)/proyectos/[id]/reportes/actions";
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

type ViaticoPayload = {
  empleado_id: string;
  empresa_id: string;
  proyecto_id?: string;
  fecha_gasto: string;
  concepto: string;
  categoria: string;
  monto: string;
  observaciones?: string;
};

type ReportePayload = {
  proyecto_id: string;
  modo: "manual";
  tipo: string;
  severidad: string;
  titulo: string;
  resumen?: string;
  contenido?: string;
  fecha_evento?: string;
  fecha_reporte: string;
  ubicacion?: string;
  impacto?: string;
  accion_correctiva?: string;
  fecha_compromiso?: string;
  responsable_seguimiento?: string;
  tarea_id?: string;
  visible_cliente: boolean;
  estado: string;
};

type LevantamientoCompletarPasoPayload = {
  levantamiento_id: string;
  paso_numero: string;
  observaciones: string;
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

    // ----- Viáticos -----
    // Nota: el ticket (File) NO se incluye en payload — el viático se crea
    // sin foto del ticket cuando se sincroniza offline.
    registerHandler<ViaticoPayload>(
      "viaticos.create",
      async (entry: QueueEntry<ViaticoPayload>) => {
        const fd = payloadToFormData(entry.payload as Record<string, unknown>);
        const r = await crearViatico(
          { ok: false, viaticoId: null, error: null },
          fd,
        );
        return { ok: !!r.ok, error: r.error ?? null };
      },
    );

    // ----- Reportes (solo modo manual; modo PDF requiere conexión) -----
    registerHandler<ReportePayload>(
      "reporte.create",
      async (entry: QueueEntry<ReportePayload>) => {
        const fd = payloadToFormData(entry.payload as Record<string, unknown>);
        const r = await crearReporte(
          { ok: false, error: null, reporteId: null },
          fd,
        );
        return { ok: !!r.ok, error: r.error ?? null };
      },
    );

    // ----- Levantamientos: completar paso -----
    registerHandler<LevantamientoCompletarPasoPayload>(
      "levantamiento.completarPaso",
      async (entry: QueueEntry<LevantamientoCompletarPasoPayload>) => {
        const fd = payloadToFormData(entry.payload as Record<string, unknown>);
        const r = await completarPaso({ ok: false, error: null }, fd);
        return { ok: !!r.ok, error: r.error ?? null };
      },
    );

    // Agregar más handlers acá (fotos, etc.)
  }, []);

  return null;
}
