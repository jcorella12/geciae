"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";

import {
  cancelarOT,
  confirmarOTDestino,
  confirmarOTOrigen,
  confirmarRecibidoOT,
  iniciarTrabajoOT,
  marcarCompletadaOT,
  marcarOTListaParaCobrar,
} from "../actions";

export type OTAccionesProps = {
  ocId: string;
  estado: string;
  origenId: string;
  destinoId: string;
  capturadoPor: string;
  aprobadoOrigenPor: string | null;
  aprobadoDestinoPor: string | null;
  /** Empresas del usuario actual donde es ceo/director/operativo */
  empresasGestionables: string[];
  callerId: string | null;
};

export function OTActionButtons(props: OTAccionesProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
    });
  }

  function pedirMotivo(label: string): string | null {
    const m = window.prompt(`Motivo de ${label} (mín 5 caracteres):`);
    if (!m || m.trim().length < 5) {
      alert("Motivo requerido (al menos 5 caracteres).");
      return null;
    }
    return m.trim();
  }

  const esOrigen = props.empresasGestionables.includes(props.origenId);
  const esDestino = props.empresasGestionables.includes(props.destinoId);
  const yaFirmaOrigen = props.aprobadoOrigenPor != null;
  const yaFirmaDestino = props.aprobadoDestinoPor != null;
  const yaTerminada =
    props.estado === "facturada" ||
    props.estado === "cobrada" ||
    props.estado === "cancelada";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* SOLICITADA: doble confirmación */}
        {props.estado === "solicitada" && (
          <>
            {esOrigen && !yaFirmaOrigen && (
              <Button
                size="sm"
                onClick={() => run(() => confirmarOTOrigen(props.ocId))}
                disabled={isPending}
              >
                {yaFirmaDestino
                  ? "Confirmar como origen y aprobar"
                  : "Confirmar como origen"}
              </Button>
            )}
            {esDestino && !yaFirmaDestino && (
              <Button
                size="sm"
                onClick={() => run(() => confirmarOTDestino(props.ocId))}
                disabled={isPending}
              >
                {yaFirmaOrigen
                  ? "Confirmar como destino y aprobar"
                  : "Confirmar como destino"}
              </Button>
            )}
          </>
        )}

        {/* APROBADA: empresa destino arranca */}
        {props.estado === "aprobada" && esDestino && (
          <Button
            size="sm"
            onClick={() => run(() => iniciarTrabajoOT(props.ocId))}
            disabled={isPending}
          >
            Iniciar trabajo
          </Button>
        )}

        {/* APROBADA o EN PROCESO: empresa destino marca completada */}
        {(props.estado === "aprobada" || props.estado === "en_proceso") &&
          esDestino && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!(await confirm("¿Marcar como completada?"))) return;
                run(() => marcarCompletadaOT(props.ocId));
              }}
              disabled={isPending}
            >
              Marcar completada
            </Button>
          )}

        {/* COMPLETADA_ORIGEN: empresa origen confirma recibido */}
        {props.estado === "completada_origen" && esOrigen && (
          <Button
            size="sm"
            onClick={async () => {
              if (!(await confirm("¿Confirmar que recibiste el servicio?")))
                return;
              run(() => confirmarRecibidoOT(props.ocId));
            }}
            disabled={isPending}
          >
            Confirmar recibido
          </Button>
        )}

        {/* S2-T6: CONFIRMADA_DESTINO → empresa origen autoriza facturar */}
        {props.estado === "confirmada_destino" && esOrigen && (
          <Button
            size="sm"
            onClick={async () => {
              if (
                !(await confirm(
                  "¿Autorizar a la empresa destino a emitir la factura inter-co? Después, al timbrar el CFDI emitido vinculado a esta OT, pasa automáticamente a 'facturada' y al cobrarlo, a 'cobrada'.",
                ))
              )
                return;
              run(() => marcarOTListaParaCobrar(props.ocId));
            }}
            disabled={isPending}
          >
            Autorizar facturación
          </Button>
        )}

        {/* CANCELAR (cualquier estado pre-facturada) */}
        {!yaTerminada &&
          (esOrigen || esDestino) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const motivo = pedirMotivo("cancelación");
                if (!motivo) return;
                run(() => cancelarOT(props.ocId, motivo));
              }}
              disabled={isPending}
            >
              Cancelar OT
            </Button>
          )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Indicador de doble firma */}
      {props.estado === "solicitada" && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            {yaFirmaOrigen ? "✓" : "○"} Confirmación origen
          </span>
          <span>
            {yaFirmaDestino ? "✓" : "○"} Confirmación destino
          </span>
        </div>
      )}
    </div>
  );
}
