"use client";

import { CheckCircle2, Download, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";

import {
  descargarMesActualTodasEmpresas,
  type ResumenBulkItem,
} from "./descarga-actions";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * Botón que dispara `descargarMesActualTodasEmpresas`: crea 2 solicitudes
 * (emitidos + recibidos) para el mes en curso en cada empresa con FIEL
 * activa vigente. Muestra resumen al terminar.
 */
export function BotonBulkMesActual({
  variant = "default",
  className,
}: {
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resumen, setResumen] = useState<ResumenBulkItem[] | null>(null);

  const ahora = new Date();
  const labelMes = `${MESES[ahora.getMonth()]} ${ahora.getFullYear()}`;

  async function handleClick() {
    if (
      !(await confirm(
        `Se crearán solicitudes al SAT para TODAS las empresas con FIEL activa, ` +
          `cubriendo del 1 al ${ahora.getDate()} de ${labelMes} ` +
          `(emitidos + recibidos). ¿Continuar?`,
      ))
    ) {
      return;
    }
    setResumen(null);
    startTransition(async () => {
      const r = await descargarMesActualTodasEmpresas();
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
        <Download className="mr-1.5 h-4 w-4" />
        {pending
          ? "Solicitando al SAT…"
          : `Descargar mes actual (todas las empresas)`}
      </Button>

      {resumen !== null && resumen.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setResumen(null);
          }}
        >
          <div className="w-full max-w-2xl rounded-md border border-border bg-card shadow-lg">
            <div className="border-b border-border px-5 py-3">
              <h3 className="text-[15px] font-semibold">
                Resumen de descarga masiva — {labelMes}
              </h3>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {resumen.filter((r) => r.ok).length}/{resumen.length}{" "}
                solicitudes aceptadas. Las exitosas quedarán en estado
                &quot;Solicitada al SAT&quot; — verifícalas más tarde.
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              <ul className="space-y-1.5">
                {resumen.map((r, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-2 rounded-md border px-3 py-2 text-[12.5px] ${
                      r.ok
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    {r.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-700" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">
                        {r.empresa_codigo} —{" "}
                        {r.tipo === "emitidos" ? "Emitidos" : "Recibidos"}
                      </div>
                      {r.error && (
                        <div className="mt-0.5 text-[11px] text-red-700">
                          {r.error}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setResumen(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {resumen !== null && resumen.length === 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setResumen(null)}
        >
          <div className="max-w-md rounded-md border border-border bg-card p-5 shadow-lg">
            <h3 className="mb-2 text-[15px] font-semibold">
              Sin empresas con FIEL activa
            </h3>
            <p className="text-[12.5px] text-ink-3">
              No hay FIELs vigentes para procesar. Sube al menos una FIEL
              desde Configuración SAT.
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => setResumen(null)}
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
