"use client";

import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { verificarPendientesEnBloque } from "./descarga-actions";

type ResumenItem = {
  descarga_id: string;
  empresa_codigo: string;
  tipo: "emitidos" | "recibidos";
  estado_anterior: string;
  estado_final?: string;
  listo: boolean;
  procesado?: { importados: number; duplicados: number; errores: number };
  error?: string;
};

/**
 * Verifica todas las descargas pendientes (solicitada/verificando/
 * lista_descargar) y auto-procesa las que ya estén listas en el SAT.
 */
export function BotonVerificarPendientes({
  variant = "outline",
  className,
}: {
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resumen, setResumen] = useState<ResumenItem[] | null>(null);

  function handleClick() {
    setResumen(null);
    startTransition(async () => {
      const r = await verificarPendientesEnBloque();
      setResumen(r.resumen);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={pending}
        variant={variant}
        className={className}
      >
        <RefreshCw className={`mr-1.5 h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Verificando…" : "Verificar pendientes"}
      </Button>

      {resumen !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setResumen(null);
          }}
        >
          <div className="w-full max-w-2xl rounded-md border border-border bg-card shadow-lg">
            <div className="border-b border-border px-5 py-3">
              <h3 className="text-[15px] font-semibold">
                Resumen de verificación
              </h3>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {resumen.length === 0
                  ? "No había descargas pendientes."
                  : `${resumen.length} descarga(s) revisadas. Las que el SAT ya tenía listas se descargaron y procesaron automáticamente.`}
              </p>
            </div>

            {resumen.length > 0 && (
              <div className="max-h-[60vh] overflow-y-auto p-5">
                <ul className="space-y-1.5">
                  {resumen.map((r) => {
                    const isProcesado = !!r.procesado;
                    const sigueEnProceso = !r.listo && !r.error;
                    const tieneError = !!r.error;

                    return (
                      <li
                        key={r.descarga_id}
                        className={`rounded-md border px-3 py-2 text-[12.5px] ${
                          tieneError
                            ? "border-red-200 bg-red-50"
                            : isProcesado
                              ? "border-emerald-200 bg-emerald-50"
                              : sigueEnProceso
                                ? "border-amber-200 bg-amber-50"
                                : "border-sky-200 bg-sky-50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {tieneError ? (
                            <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-700" />
                          ) : isProcesado ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" />
                          ) : (
                            <RefreshCw className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">
                              {r.empresa_codigo} —{" "}
                              {r.tipo === "emitidos" ? "Emitidos" : "Recibidos"}
                            </div>
                            <div className="mt-0.5 text-[11px] text-ink-3">
                              {isProcesado && r.procesado
                                ? `✓ Completada: ${r.procesado.importados} nuevos, ${r.procesado.duplicados} duplicados${r.procesado.errores > 0 ? `, ${r.procesado.errores} errores` : ""}`
                                : tieneError
                                  ? `Error: ${r.error}`
                                  : `Sigue en proceso (estado: ${r.estado_final ?? r.estado_anterior}). Reintenta más tarde.`}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button size="sm" variant="ghost" onClick={() => setResumen(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
