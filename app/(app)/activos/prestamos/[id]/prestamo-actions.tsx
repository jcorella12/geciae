"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  aprobarPrestamo,
  cancelarPrestamo,
  devolverPrestamo,
  rechazarPrestamo,
  recogerPrestamo,
} from "../actions";

export function PrestamoActions({
  prestamoId,
  estado,
  esSolicitante,
  esAprobador,
}: {
  prestamoId: string;
  estado: string;
  esSolicitante: boolean;
  esAprobador: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [showRechazar, setShowRechazar] = useState(false);
  const [showRecoger, setShowRecoger] = useState(false);
  const [showDevolver, setShowDevolver] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [estadoIni, setEstadoIni] = useState("");
  const [estadoFin, setEstadoFin] = useState("");
  const [usoReal, setUsoReal] = useState("");
  const [danos, setDanos] = useState("");
  const [reqMantto, setReqMantto] = useState(false);
  const [reqCalib, setReqCalib] = useState(false);

  function handle(fn: () => Promise<{ ok: boolean; error: string | null }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) alert(`Error: ${r.error}`);
      else window.location.reload();
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-3 text-[13.5px] font-semibold">Acciones</h3>

      {/* Aprobar / Rechazar */}
      {estado === "solicitado" && esAprobador && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handle(() => aprobarPrestamo(prestamoId))} disabled={pending}>
            ✓ Aprobar
          </Button>
          <Button variant="destructive" onClick={() => setShowRechazar(true)} disabled={pending}>
            ✗ Rechazar
          </Button>
        </div>
      )}

      {showRechazar && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
          <Input
            placeholder="Motivo de rechazo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mb-2"
          />
          <Button
            variant="destructive"
            disabled={pending || motivo.trim().length < 3}
            onClick={() => handle(() => rechazarPrestamo(prestamoId, motivo))}
          >
            Confirmar rechazo
          </Button>
        </div>
      )}

      {/* Cancelar */}
      {(estado === "solicitado" || estado === "aprobado") && (esSolicitante || esAprobador) && (
        <div className="mt-3">
          <Button
            variant="outline"
            onClick={() => {
              const m = prompt("Motivo de cancelación:");
              if (m && m.trim().length >= 5) handle(() => cancelarPrestamo(prestamoId, m));
            }}
            disabled={pending}
          >
            Cancelar préstamo
          </Button>
        </div>
      )}

      {/* Recoger */}
      {estado === "aprobado" && (
        <div>
          <Button onClick={() => setShowRecoger(true)} disabled={pending}>
            🚚 Marcar como recogido
          </Button>
          {showRecoger && (
            <div className="mt-3 rounded-md border border-violet-200 bg-violet-50 p-3 space-y-2">
              <Input
                placeholder="Estado inicial del activo (limpio, completo, etc.)"
                value={estadoIni}
                onChange={(e) => setEstadoIni(e.target.value)}
              />
              <Button
                onClick={() => handle(() => recogerPrestamo(prestamoId, estadoIni))}
                disabled={pending || estadoIni.trim().length < 3}
              >
                Confirmar recogida
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Devolver */}
      {estado === "recogido" && (
        <div>
          <Button onClick={() => setShowDevolver(true)} disabled={pending}>
            📦 Marcar como devuelto
          </Button>
          {showDevolver && (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-2">
              <Input
                placeholder="Uso real (horas/días/etc.)"
                type="number"
                step="0.01"
                min="0"
                value={usoReal}
                onChange={(e) => setUsoReal(e.target.value)}
              />
              <Input
                placeholder="Estado final del activo"
                value={estadoFin}
                onChange={(e) => setEstadoFin(e.target.value)}
              />
              <Input
                placeholder="Daños reportados (opcional)"
                value={danos}
                onChange={(e) => setDanos(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reqMantto} onChange={(e) => setReqMantto(e.target.checked)} />
                Requiere mantenimiento
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reqCalib} onChange={(e) => setReqCalib(e.target.checked)} />
                Requiere calibración
              </label>
              <Button
                onClick={() =>
                  handle(() =>
                    devolverPrestamo(prestamoId, {
                      uso_real: parseFloat(usoReal),
                      estado_final: estadoFin,
                      daños: danos || undefined,
                      requiere_mantenimiento: reqMantto,
                      requiere_calibracion: reqCalib,
                    }),
                  )
                }
                disabled={pending || !usoReal || estadoFin.trim().length < 3}
              >
                Confirmar devolución
              </Button>
            </div>
          )}
        </div>
      )}

      {["rechazado", "devuelto", "facturado", "cancelado"].includes(estado) && (
        <p className="text-sm text-ink-3">Sin acciones disponibles para este estado.</p>
      )}
    </section>
  );
}
