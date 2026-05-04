"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { EstadoCotizacion } from "@/lib/cotizaciones/state";

import {
  aprobarInternamente,
  convertirAProyecto,
  eliminarBorrador,
  enviarACliente,
  marcarAceptada,
  marcarRechazada,
  nuevaVersion,
} from "../actions";

export function CotizacionAcciones({
  cotizacionId,
  estado,
  aprobada,
  puedeEditar,
  puedeAprobarInterno,
}: {
  cotizacionId: string;
  estado: EstadoCotizacion;
  aprobada: boolean;
  puedeEditar: boolean;
  puedeAprobarInterno: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConvertir, setShowConvertir] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function pedirMotivo(): string | null {
    const m = window.prompt("Motivo de rechazo (mín 5 caracteres):");
    if (!m || m.trim().length < 5) {
      alert("Motivo requerido (al menos 5 caracteres).");
      return null;
    }
    return m.trim();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {estado === "borrador" && puedeAprobarInterno && !aprobada && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!confirm("¿Aprobar internamente esta cotización?")) return;
              run(() => aprobarInternamente(cotizacionId));
            }}
            disabled={isPending}
          >
            Aprobar internamente
          </Button>
        )}

        {estado === "borrador" && puedeEditar && (
          <>
            <Button
              size="sm"
              onClick={() => {
                if (!confirm("¿Enviar al cliente? Pasará a estado 'enviada'."))
                  return;
                run(() => enviarACliente(cotizacionId));
              }}
              disabled={isPending}
            >
              Enviar al cliente
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (
                  !confirm(
                    "¿Eliminar este borrador? Esta acción no se puede deshacer.",
                  )
                )
                  return;
                run(async () => {
                  const r = await eliminarBorrador(cotizacionId);
                  if (r.ok) router.push("/comercial/cotizaciones");
                  return r;
                });
              }}
              disabled={isPending}
            >
              Eliminar borrador
            </Button>
          </>
        )}

        {(estado === "borrador" || estado === "enviada") && puedeEditar && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!confirm("¿Marcar como aceptada por el cliente?")) return;
                run(() => marcarAceptada(cotizacionId));
              }}
              disabled={isPending}
            >
              Marcar aceptada
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                const motivo = pedirMotivo();
                if (!motivo) return;
                run(() => marcarRechazada(cotizacionId, motivo));
              }}
              disabled={isPending}
            >
              Marcar rechazada
            </Button>
          </>
        )}

        {estado === "aceptada" && puedeEditar && (
          <Button
            size="sm"
            onClick={() => setShowConvertir((v) => !v)}
            disabled={isPending}
          >
            {showConvertir ? "Cancelar conversión" : "Convertir a proyecto"}
          </Button>
        )}

        {(estado === "rechazada" ||
          estado === "vencida" ||
          estado === "convertida") &&
          puedeEditar && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!confirm("¿Crear una nueva versión basada en ésta?")) return;
                startTransition(async () => {
                  const r = await nuevaVersion(cotizacionId);
                  if (r.ok && r.nuevaCotizacionId) {
                    router.push(
                      `/comercial/cotizaciones/${r.nuevaCotizacionId}`,
                    );
                  } else {
                    setError(r.error);
                  }
                });
              }}
              disabled={isPending}
            >
              Crear nueva versión
            </Button>
          )}
      </div>

      {showConvertir && estado === "aceptada" && (
        <ConversionForm
          cotizacionId={cotizacionId}
          onCancel={() => setShowConvertir(false)}
          onError={setError}
        />
      )}

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ConversionForm({
  cotizacionId,
  onCancel,
  onError,
}: {
  cotizacionId: string;
  onCancel: () => void;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        onError(null);
        startTransition(async () => {
          const r = await convertirAProyecto(cotizacionId, fd);
          if (r.ok && r.proyectoId) {
            router.push(`/proyectos/${r.proyectoId}`);
          } else {
            onError(r.error ?? "Error al convertir");
          }
        });
      }}
      className="space-y-3 rounded-md border border-border bg-card p-4"
    >
      <h3 className="text-sm font-semibold">Convertir cotización a proyecto</h3>
      <p className="text-xs text-ink-3">
        Se creará un proyecto con los datos de la cotización aceptada. El monto
        contratado se toma del total.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium">Código *</label>
          <input
            name="codigo"
            required
            placeholder="P-2026-001"
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium">Nombre *</label>
          <input
            name="nombre"
            required
            placeholder="Instalación SFV residencial"
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium">Tipo</label>
          <select
            name="tipo"
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="instalacion_solar"
          >
            <option value="instalacion_solar">Instalación solar</option>
            <option value="electrico">Eléctrico</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="suministro">Suministro</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium">
            Presupuesto costo (estimado)
          </label>
          <input
            name="presupuesto_costo"
            type="number"
            step="0.01"
            min="0"
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm tnum"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium">Inicio planeado</label>
          <input
            name="fecha_inicio_planeado"
            type="date"
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium">Fin planeado</label>
          <input
            name="fecha_fin_planeado"
            type="date"
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-ink-3 hover:text-ink-1"
        >
          Cancelar
        </button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Convirtiendo…" : "Crear proyecto"}
        </Button>
      </div>
    </form>
  );
}
