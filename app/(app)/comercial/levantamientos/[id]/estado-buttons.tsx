"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Label } from "@/components/ui/label";
import { initialSimpleLevState } from "@/lib/levantamientos/state";

import { cambiarEstadoLev, marcarCompletado } from "../actions";

type Proyecto = {
  id: string;
  codigo: string;
  nombre: string;
};

export function EstadoButtons({
  levantamientoId,
  estado,
  proyectosDestino,
}: {
  levantamientoId: string;
  estado: string;
  proyectosDestino: Proyecto[];
}) {
  const [marcarState, marcarAction] = useFormState(
    marcarCompletado,
    initialSimpleLevState,
  );
  const [cambiarState, cambiarAction] = useFormState(
    cambiarEstadoLev,
    initialSimpleLevState,
  );
  const [showConvert, setShowConvert] = useState(false);

  const error = marcarState.error || cambiarState.error;

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">Cambio de estado</h3>

      <div className="space-y-3">
        {(estado === "programado" || estado === "en_curso") && (
          <form action={marcarAction} className="inline-block">
            <input
              type="hidden"
              name="levantamiento_id"
              value={levantamientoId}
            />
            <BtnMarcar />
          </form>
        )}

        {estado === "completado" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              ¿La oportunidad se cerró?
            </p>
            <div className="flex flex-wrap gap-2">
              {!showConvert ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowConvert(true)}
                >
                  Convertido a venta…
                </Button>
              ) : (
                <form
                  action={cambiarAction}
                  className="w-full space-y-2 rounded-md border border-border bg-bg-2 p-3"
                >
                  <input
                    type="hidden"
                    name="levantamiento_id"
                    value={levantamientoId}
                  />
                  <input
                    type="hidden"
                    name="estado"
                    value="convertido_a_venta"
                  />
                  <Label
                    htmlFor="proyecto_destino_id"
                    className="text-xs"
                  >
                    Proyecto al que se reasigna el costo
                  </Label>
                  <select
                    id="proyecto_destino_id"
                    name="proyecto_destino_id"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— elige proyecto —</option>
                    {proyectosDestino.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} — {p.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <BtnConfirmConvert />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConvert(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}

              <form action={cambiarAction} className="inline">
                <input
                  type="hidden"
                  name="levantamiento_id"
                  value={levantamientoId}
                />
                <input type="hidden" name="estado" value="no_convertido" />
                <BtnNoConvert />
              </form>
            </div>
          </div>
        )}

        {(estado === "convertido_a_venta" ||
          estado === "no_convertido") && (
          <p className="text-xs text-muted-foreground">
            Estado final. Para volver a abrir, contacta al CEO.
          </p>
        )}

        {estado !== "cancelado" &&
          estado !== "convertido_a_venta" &&
          estado !== "no_convertido" && (
            <form action={cambiarAction} className="inline-block">
              <input
                type="hidden"
                name="levantamiento_id"
                value={levantamientoId}
              />
              <input type="hidden" name="estado" value="cancelado" />
              <BtnCancelar />
            </form>
          )}
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function BtnMarcar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Cerrando…" : "Marcar como completado"}
    </Button>
  );
}

function BtnConfirmConvert() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Convirtiendo…" : "Confirmar conversión"}
    </Button>
  );
}

function BtnNoConvert() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        const button = e.currentTarget;
        const form = button.form;
        if (!form) return;
        void (async () => {
          const ok = await confirm(
            "¿Marcar como NO convertido? El costo queda en el sub-centro del vendedor para evaluación.",
          );
          if (ok) form.requestSubmit(button);
        })();
      }}
    >
      No convertido
    </Button>
  );
}

function BtnCancelar() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        const button = e.currentTarget;
        const form = button.form;
        if (!form) return;
        void (async () => {
          const ok = await confirm({
            message: "¿Cancelar este levantamiento?",
            danger: true,
            confirmLabel: "Cancelar levantamiento",
            cancelLabel: "Volver",
          });
          if (ok) form.requestSubmit(button);
        })();
      }}
      className="text-destructive hover:bg-destructive/10"
    >
      Cancelar levantamiento
    </Button>
  );
}
