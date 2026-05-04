"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { extraerSaldoEdocuentaIA } from "./actions";

/**
 * Botón pequeño en cada fila de estado de cuenta que dispara la extracción IA
 * (Claude vision) para llenar saldo_inicial/final, total_abonos/cargos, etc.
 */
export function EdoctaIAButton({
  estadoId,
  yaExtraido,
}: {
  estadoId: string;
  yaExtraido: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    setSuccess(null);
    if (
      yaExtraido &&
      !confirm(
        "Este estado ya tiene datos extraídos. ¿Volver a leerlo con IA? (Costo: ~1 call a Claude Haiku, gratis si usa cache)",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await extraerSaldoEdocuentaIA(estadoId);
      if (r.ok) {
        setSuccess(
          `✓ Saldo final $${(r.saldo_final ?? 0).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}${r.num_movs ? ` · ${r.num_movs} movs` : ""}`,
        );
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
          yaExtraido
            ? "border-border bg-card text-ink-3 hover:bg-bg-2"
            : "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
        } disabled:cursor-wait disabled:opacity-50`}
        title={
          yaExtraido
            ? "Volver a extraer con IA (usa cache si el PDF no cambió)"
            : "Extraer datos del PDF con Claude Haiku"
        }
      >
        <Sparkles className="h-2.5 w-2.5" />
        {isPending
          ? "Leyendo…"
          : yaExtraido
            ? "Releer IA"
            : "Leer IA"}
      </button>
      {success && (
        <span className="text-[10px] text-emerald-600">{success}</span>
      )}
      {error && (
        <span className="max-w-[180px] text-right text-[10px] text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
