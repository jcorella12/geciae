"use client";

import { Ban, FileCheck2, FileX, RotateCcw, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  initialObligacionState,
  initialSimpleState,
  type EstadoObligacion,
} from "@/lib/obligaciones/state";

import {
  marcarNoAplica,
  marcarPagada,
  marcarPresentada,
  marcarRechazada,
  revertirEstado,
  subirAcuse,
  subirComprobante,
} from "../actions";

type Section = "presentada" | "pagada" | "no_aplica" | "rechazada" | "acuse" | "comprobante" | "revertir" | null;

/**
 * Panel de acciones contextual para la página de detalle de una obligación.
 *
 * El estado actual de la obligación determina qué acciones aparecen.
 * Cada acción es un mini-form expandible (acordeón) que se cierra al éxito.
 */
export function AccionesPanel({
  obligacionId,
  estadoActual,
  puedeRevertir,
}: {
  obligacionId: string;
  estadoActual: EstadoObligacion;
  puedeRevertir: boolean;
}) {
  const [open, setOpen] = useState<Section>(null);

  const isPendiente =
    estadoActual === "pendiente" ||
    estadoActual === "en_proceso" ||
    estadoActual === "fuera_plazo" ||
    estadoActual === "extemporanea";
  const isPresentada = estadoActual === "presentada";
  const isTerminal =
    estadoActual === "pagada" ||
    estadoActual === "no_aplica" ||
    estadoActual === "rechazada";

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <header className="border-b border-border px-5 py-3">
        <h2 className="text-[13.5px] font-semibold">Acciones disponibles</h2>
      </header>
      <div className="space-y-2 p-3">
        {isPendiente && (
          <>
            <ActionRow
              icon={<FileCheck2 className="h-4 w-4 text-emerald-700" />}
              label="Marcar como presentada"
              hint="Captura número de operación y monto declarado."
              isOpen={open === "presentada"}
              onToggle={() => setOpen(open === "presentada" ? null : "presentada")}
            >
              <PresentadaForm
                obligacionId={obligacionId}
                onDone={() => setOpen(null)}
              />
            </ActionRow>
            <ActionRow
              icon={<Upload className="h-4 w-4 text-brand" />}
              label="Subir acuse (PDF)"
              hint="Acuse del SAT. Marca como presentada al subir si aún no."
              isOpen={open === "acuse"}
              onToggle={() => setOpen(open === "acuse" ? null : "acuse")}
            >
              <UploadForm
                obligacionId={obligacionId}
                kind="acuse"
                accept="application/pdf"
                action={subirAcuse}
                onDone={() => setOpen(null)}
              />
            </ActionRow>
            <ActionRow
              icon={<Ban className="h-4 w-4 text-ink-3" />}
              label="Marcar no aplica"
              hint="Indica el motivo. La obligación ya no contará como pendiente."
              isOpen={open === "no_aplica"}
              onToggle={() => setOpen(open === "no_aplica" ? null : "no_aplica")}
            >
              <NoAplicaForm
                obligacionId={obligacionId}
                onDone={() => setOpen(null)}
              />
            </ActionRow>
          </>
        )}

        {isPresentada && (
          <>
            <ActionRow
              icon={<FileCheck2 className="h-4 w-4 text-emerald-700" />}
              label="Marcar como pagada"
              hint="Captura monto pagado y saldo a favor si aplica."
              isOpen={open === "pagada"}
              onToggle={() => setOpen(open === "pagada" ? null : "pagada")}
            >
              <PagadaForm
                obligacionId={obligacionId}
                onDone={() => setOpen(null)}
              />
            </ActionRow>
            <ActionRow
              icon={<Upload className="h-4 w-4 text-brand" />}
              label="Subir comprobante de pago"
              hint="PDF, JPG o PNG."
              isOpen={open === "comprobante"}
              onToggle={() =>
                setOpen(open === "comprobante" ? null : "comprobante")
              }
            >
              <UploadForm
                obligacionId={obligacionId}
                kind="comprobante"
                accept="application/pdf,image/jpeg,image/png"
                action={subirComprobante}
                onDone={() => setOpen(null)}
              />
            </ActionRow>
            <ActionRow
              icon={<FileX className="h-4 w-4 text-red-700" />}
              label="Marcar rechazada"
              hint="Si el SAT rechazó la presentación. Indica el motivo."
              isOpen={open === "rechazada"}
              onToggle={() =>
                setOpen(open === "rechazada" ? null : "rechazada")
              }
            >
              <RechazadaForm
                obligacionId={obligacionId}
                onDone={() => setOpen(null)}
              />
            </ActionRow>
          </>
        )}

        {isTerminal && puedeRevertir && (
          <ActionRow
            icon={<RotateCcw className="h-4 w-4 text-amber-700" />}
            label="Revertir a pendiente"
            hint="Solo CEO o tesorero. Limpia fechas y montos. Indica motivo."
            isOpen={open === "revertir"}
            onToggle={() => setOpen(open === "revertir" ? null : "revertir")}
          >
            <RevertirForm
              obligacionId={obligacionId}
              onDone={() => setOpen(null)}
            />
          </ActionRow>
        )}

        {!isPendiente && !isPresentada && !isTerminal && (
          <p className="px-3 py-2 text-[12px] text-ink-3">
            No hay acciones disponibles para este estado.
          </p>
        )}
      </div>
    </section>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  isOpen,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-bg-2"
        aria-expanded={isOpen}
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1">
          <span className="block text-[13px] font-medium">{label}</span>
          {hint && (
            <span className="block text-[11px] text-ink-3">{hint}</span>
          )}
        </span>
        <span className="text-[10px] text-ink-3">{isOpen ? "▾" : "▸"}</span>
      </button>
      {isOpen && (
        <div className="border-t border-border bg-bg-2/30 p-3">{children}</div>
      )}
    </div>
  );
}

function FieldErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-0.5 text-[10.5px] text-destructive">{msg}</p>;
}

function PresentadaForm({
  obligacionId,
  onDone,
}: {
  obligacionId: string;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(
    marcarPresentada,
    initialObligacionState,
  );
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="obligacion_id" value={obligacionId} />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px]">Fecha presentación *</Label>
          <Input
            name="fecha_presentacion"
            type="date"
            defaultValue={today}
            required
            className="h-9"
          />
          <FieldErr msg={state.fieldErrors?.fecha_presentacion?.[0]} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Número de operación</Label>
          <Input
            name="numero_operacion"
            maxLength={120}
            placeholder="Folio SAT"
            className="h-9 font-mono"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Monto calculado (MXN)</Label>
        <Input
          name="monto_calculado"
          type="number"
          min="0"
          step="0.01"
          className="h-9 font-mono"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Observaciones</Label>
        <textarea
          name="observaciones"
          rows={2}
          maxLength={2000}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
          {state.error}
        </p>
      )}
      <SubmitBtn label="Marcar presentada" />
    </form>
  );
}

function PagadaForm({
  obligacionId,
  onDone,
}: {
  obligacionId: string;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(marcarPagada, initialObligacionState);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="obligacion_id" value={obligacionId} />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px]">Fecha pago *</Label>
          <Input
            name="fecha_pago"
            type="date"
            defaultValue={today}
            required
            className="h-9"
          />
          <FieldErr msg={state.fieldErrors?.fecha_pago?.[0]} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Monto pagado *</Label>
          <Input
            name="monto_pagado"
            type="number"
            min="0"
            step="0.01"
            required
            className="h-9 font-mono"
          />
          <FieldErr msg={state.fieldErrors?.monto_pagado?.[0]} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Saldo a favor (si aplica)</Label>
        <Input
          name="saldo_a_favor"
          type="number"
          min="0"
          step="0.01"
          className="h-9 font-mono"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Observaciones</Label>
        <textarea
          name="observaciones"
          rows={2}
          maxLength={2000}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
          {state.error}
        </p>
      )}
      <SubmitBtn label="Marcar pagada" />
    </form>
  );
}

function NoAplicaForm({
  obligacionId,
  onDone,
}: {
  obligacionId: string;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(
    marcarNoAplica,
    initialObligacionState,
  );
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="obligacion_id" value={obligacionId} />
      <div className="space-y-1">
        <Label className="text-[11px]">Justificación *</Label>
        <textarea
          name="observaciones"
          rows={3}
          required
          minLength={5}
          maxLength={2000}
          placeholder="Empresa sin operaciones este periodo / contribuyente sin obligación de presentar / etc."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <FieldErr msg={state.fieldErrors?.observaciones?.[0]} />
      </div>
      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
          {state.error}
        </p>
      )}
      <SubmitBtn label="Marcar no aplica" />
    </form>
  );
}

function RechazadaForm({
  obligacionId,
  onDone,
}: {
  obligacionId: string;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(
    marcarRechazada,
    initialObligacionState,
  );
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="obligacion_id" value={obligacionId} />
      <div className="space-y-1">
        <Label className="text-[11px]">Motivo del rechazo *</Label>
        <textarea
          name="observaciones"
          rows={3}
          required
          minLength={5}
          maxLength={2000}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <FieldErr msg={state.fieldErrors?.observaciones?.[0]} />
      </div>
      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
          {state.error}
        </p>
      )}
      <SubmitBtn label="Marcar rechazada" variant="destructive" />
    </form>
  );
}

function RevertirForm({
  obligacionId,
  onDone,
}: {
  obligacionId: string;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(revertirEstado, initialSimpleState);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="obligacion_id" value={obligacionId} />
      <div className="space-y-1">
        <Label className="text-[11px]">Motivo de la reversión *</Label>
        <textarea
          name="motivo"
          rows={3}
          required
          minLength={5}
          maxLength={2000}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
          {state.error}
        </p>
      )}
      <SubmitBtn label="Revertir a pendiente" variant="outline" />
    </form>
  );
}

function UploadForm({
  obligacionId,
  kind,
  accept,
  action,
  onDone,
}: {
  obligacionId: string;
  kind: "acuse" | "comprobante";
  accept: string;
  action: (
    state: { ok: boolean; error: string | null },
    formData: FormData,
  ) => Promise<{ ok: boolean; error: string | null }>;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(action, initialSimpleState);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="obligacion_id" value={obligacionId} />
      <div className="space-y-1">
        <Label className="text-[11px]">
          {kind === "acuse" ? "Acuse PDF" : "Comprobante (PDF/JPG/PNG)"}
        </Label>
        <Input
          name="archivo"
          type="file"
          accept={accept}
          required
          className="h-9 file:mr-2 file:rounded file:border-0 file:bg-bg-2 file:px-2 file:py-1 file:text-[11px]"
        />
      </div>
      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
          {state.error}
        </p>
      )}
      <SubmitBtn label="Subir" />
    </form>
  );
}

function SubmitBtn({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "destructive" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}
