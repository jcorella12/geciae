"use client";

import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { extraerSaldoEdocuentaIA } from "./actions";

/**
 * Botón que procesa secuencialmente todos los estados de cuenta pendientes
 * (saldo_final = 0). Llama 1 vez por estado a Claude haiku.
 *
 * Muestra progreso en vivo y permite cancelar.
 */
export function EdoctaBulkIA({
  pendientesIds,
}: {
  pendientesIds: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [progreso, setProgreso] = useState({ done: 0, ok: 0, err: 0 });
  const [activo, setActivo] = useState(false);
  const [errLog, setErrLog] = useState<string[]>([]);
  const [stop, setStop] = useState(false);

  if (pendientesIds.length === 0) return null;

  function handleClick() {
    if (
      !confirm(
        `Procesar ${pendientesIds.length} estados de cuenta con Claude Haiku.\n\n` +
          `Costo aproximado: ~$0.005 USD por PDF (~$${(pendientesIds.length * 0.005).toFixed(2)} USD total).\n\n` +
          `Re-procesos del mismo PDF son gratis (cache).\n\n¿Continuar?`,
      )
    )
      return;
    setActivo(true);
    setStop(false);
    setProgreso({ done: 0, ok: 0, err: 0 });
    setErrLog([]);

    startTransition(async () => {
      let done = 0;
      let ok = 0;
      let err = 0;
      const errs: string[] = [];
      for (const id of pendientesIds) {
        if (stop) break;
        const r = await extraerSaldoEdocuentaIA(id);
        done += 1;
        if (r.ok) ok += 1;
        else {
          err += 1;
          errs.push(r.error ?? "error desconocido");
        }
        setProgreso({ done, ok, err });
        if (errs.length <= 5) setErrLog([...errs]);
      }
      setActivo(false);
      router.refresh();
    });
  }

  function handleStop() {
    setStop(true);
  }

  return (
    <div className="flex items-center gap-3">
      {!activo ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-[12px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3" />
          Leer {pendientesIds.length} pendientes con IA
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md bg-violet-50 px-3 py-1.5 text-[12px] font-medium text-violet-700">
            <Sparkles className="h-3 w-3 animate-pulse" />
            <span>
              {progreso.done}/{pendientesIds.length} —{" "}
              <span className="text-emerald-700">{progreso.ok} ✓</span>
              {progreso.err > 0 && (
                <>
                  {" "}
                  <span className="text-red-700">{progreso.err} ✗</span>
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={handleStop}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-bg-2"
          >
            <X className="h-3 w-3" />
            Detener
          </button>
        </div>
      )}
      {errLog.length > 0 && (
        <span className="text-[11px] text-destructive">
          Últimos errores: {errLog[errLog.length - 1]}
        </span>
      )}
    </div>
  );
}
