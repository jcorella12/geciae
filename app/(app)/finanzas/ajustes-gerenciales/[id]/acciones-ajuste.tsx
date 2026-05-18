"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { promptInput } from "@/components/ui/prompt-input";
import {
  cambiarEstadoAjuste,
  cancelarAjuste,
  regularizarAjuste,
} from "@/app/(app)/finanzas/ajustes-gerenciales/actions";
import type { EstadoAjusteGerencial } from "@/lib/ajustes-gerenciales/state";

export function AccionesAjuste({
  id,
  estado,
}: {
  id: string;
  estado: EstadoAjusteGerencial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showRegularizar, setShowRegularizar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (estado === "cancelado") {
    return (
      <span className="text-[11.5px] italic text-ink-3">
        Ajuste cancelado, sin acciones disponibles.
      </span>
    );
  }

  function activar(nuevo: "borrador" | "vigente") {
    setError(null);
    startTransition(async () => {
      const r = await cambiarEstadoAjuste(id, nuevo);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  async function cancelar() {
    const motivo = await promptInput({
      title: "Cancelar ajuste gerencial",
      message:
        "Indica el motivo de cancelación. Mínimo 20 caracteres para dejar trazabilidad.",
      label: "Motivo de cancelación",
      minLength: 20,
      multiline: true,
    });
    if (!motivo) return;
    setError(null);
    startTransition(async () => {
      const r = await cancelarAjuste(id, motivo);
      if (!r.ok) setError(r.error);
      else router.push("/finanzas/ajustes-gerenciales");
    });
  }

  function handleRegularizar(formData: FormData) {
    formData.set("id", id);
    setError(null);
    startTransition(async () => {
      const r = await regularizarAjuste(formData);
      if (!r.ok) setError(r.error);
      else {
        setShowRegularizar(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <span className="text-[11.5px] text-danger-deep">{error}</span>
      )}

      {estado === "borrador" && (
        <Button
          size="sm"
          onClick={() => activar("vigente")}
          disabled={pending}
        >
          Activar a vigente
        </Button>
      )}

      {estado === "vigente" && (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => activar("borrador")}
            disabled={pending}
          >
            Pasar a borrador
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowRegularizar(true)}
            disabled={pending}
          >
            Marcar regularizado
          </Button>
        </>
      )}

      {(estado === "borrador" || estado === "vigente") && (
        <Button
          size="sm"
          variant="ghost"
          onClick={cancelar}
          disabled={pending}
          className="text-danger hover:text-danger-deep"
        >
          Cancelar ajuste
        </Button>
      )}

      {showRegularizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <form
            action={handleRegularizar}
            className="w-full max-w-md rounded-md border border-border bg-card p-5 shadow-lg"
          >
            <h3 className="mb-1 text-[15px] font-semibold">
              Regularizar fiscalmente
            </h3>
            <p className="mb-4 text-[11.5px] text-ink-3">
              Marca este ajuste como ya pasado a contabilidad fiscal.
            </p>

            <div className="mb-3">
              <label className="mb-1 block text-[12px] font-medium">
                Fecha de regularización
              </label>
              <input
                type="date"
                name="fecha_regularizacion"
                required
                max={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-[12px] font-medium">
                Observaciones (mín. 20)
              </label>
              <textarea
                name="observaciones"
                required
                minLength={20}
                rows={3}
                placeholder="Cómo se regularizó (capitalización, reclasificación, etc.)"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Guardando…" : "Confirmar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowRegularizar(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
