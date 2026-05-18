"use client";

import { Download, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { promptInput } from "@/components/ui/prompt-input";
import type { DescargaSat, EstadoDescargaSat } from "@/lib/sat/state";

import {
  cancelarDescarga,
  descargarYProcesar,
  verificarSolicitud,
} from "../../descarga-actions";

export function BotonesFlujo({ descarga }: { descarga: DescargaSat }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estado = descarga.estado as EstadoDescargaSat;

  function verificar() {
    setError(null);
    setMensaje(null);
    startTransition(async () => {
      const r = await verificarSolicitud(descarga.id);
      if (!r.ok) {
        setError(r.error ?? "Error");
      } else if (r.procesado) {
        setMensaje(
          `✓ Procesada automáticamente: ${r.procesado.importados} nuevos, ${r.procesado.duplicados} duplicados${r.procesado.errores > 0 ? `, ${r.procesado.errores} errores` : ""}.`,
        );
        router.refresh();
      } else if (r.listo) {
        setMensaje("¡Lista para descargar! Procesando…");
        router.refresh();
      } else {
        setMensaje(
          r.mensaje ?? "Sigue procesando en el SAT. Intenta en unos minutos.",
        );
        router.refresh();
      }
    });
  }

  async function descargar() {
    if (
      !(await confirm(
        "¿Descargar y procesar paquetes? Esto puede tardar varios minutos.",
      ))
    ) {
      return;
    }
    setError(null);
    setMensaje(null);
    startTransition(async () => {
      const r = await descargarYProcesar(descarga.id);
      if (!r.ok) {
        setError(r.error ?? "Error");
      } else {
        setMensaje(
          `Descarga completa: ${r.importados} nuevos, ${r.duplicados} duplicados, ${r.errores} errores`,
        );
        router.refresh();
      }
    });
  }

  async function cancelar() {
    const motivo = await promptInput({
      title: "Cancelar descarga SAT",
      message: "Indica el motivo de cancelación (mínimo 10 caracteres).",
      label: "Motivo",
      minLength: 10,
      multiline: true,
    });
    if (!motivo) return;
    setError(null);
    startTransition(async () => {
      const r = await cancelarDescarga(descarga.id, motivo);
      if (!r.ok) setError(r.error ?? "Error");
      else router.push("/configuracion/sat");
    });
  }

  const puedeVerificar = estado === "solicitada" || estado === "verificando";
  const puedeDescargar = estado === "lista_descargar";
  const puedeCancelar =
    estado === "borrador" || estado === "solicitada" || estado === "verificando";
  const puedeReintentar = estado === "error";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-2">
        {puedeVerificar && (
          <Button onClick={verificar} disabled={pending} size="sm">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {pending ? "Verificando…" : "Verificar estado"}
          </Button>
        )}
        {puedeDescargar && (
          <Button onClick={descargar} disabled={pending} size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {pending ? "Descargando…" : "Descargar y procesar"}
          </Button>
        )}
        {puedeReintentar && (
          <Button onClick={verificar} disabled={pending} size="sm" variant="outline">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Reintentar verificación
          </Button>
        )}
        {puedeCancelar && (
          <Button
            onClick={cancelar}
            disabled={pending}
            size="sm"
            variant="ghost"
            className="text-danger hover:text-danger-deep"
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Cancelar
          </Button>
        )}
      </div>
      {mensaje && (
        <p className="text-[11.5px] text-emerald-700">{mensaje}</p>
      )}
      {error && <p className="text-[11.5px] text-danger-deep">{error}</p>}
    </div>
  );
}
