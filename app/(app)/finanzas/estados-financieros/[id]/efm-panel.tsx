"use client";

import { Pencil, Sparkles, Stamp } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/components/ui/notify";
import {
  ETIQUETA_KPI,
  initialExtraerKPIsState,
  initialSimpleEFMState,
  KPIS_EFM,
  type KPIKey,
} from "@/lib/efm/state";

import {
  actualizarKPIsManual,
  extraerKPIsAccion,
  marcarFirmados,
} from "../actions";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

/**
 * Panel de acciones para el detalle de EFM:
 *  - Botón "Extraer KPIs con IA" (requiere Balance/ER subido)
 *  - Form de captura manual de KPIs (override)
 *  - Toggle "Firmados por despacho"
 */
export function EFMPanel({
  efmId,
  kpisActuales,
  firmadosActual,
  tieneBalanceOEr,
}: {
  efmId: string;
  kpisActuales: Record<KPIKey, number | null>;
  firmadosActual: boolean;
  tieneBalanceOEr: boolean;
}) {
  return (
    <div className="space-y-4">
      <ExtraerKPIsBlock efmId={efmId} disabled={!tieneBalanceOEr} />
      <KPIsManualBlock efmId={efmId} kpisActuales={kpisActuales} />
      <FirmadosBlock efmId={efmId} firmados={firmadosActual} />
    </div>
  );
}

function ExtraerKPIsBlock({
  efmId,
  disabled,
}: {
  efmId: string;
  disabled: boolean;
}) {
  const [state, formAction] = useFormState(
    extraerKPIsAccion,
    initialExtraerKPIsState,
  );
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-[13.5px] font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Extraer KPIs con IA
          </h3>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            Lee el Estado de Resultados / Balance con Claude Haiku y guarda
            los KPIs principales. Cada llamada queda registrada en{" "}
            <code className="font-mono">ia_invocaciones</code>.
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="efm_id" value={efmId} />
          <ExtraerSubmit disabled={disabled} />
        </form>
      </header>
      {disabled && (
        <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11.5px] text-amber-800">
          Sube primero el Balance General o el Estado de Resultados.
        </p>
      )}
      {state.error && (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && state.kpis && (
        <div className="mt-3 rounded-md border border-emerald-300/40 bg-emerald-50 px-3 py-2">
          <p className="text-[12px] font-medium text-emerald-900">
            KPIs extraídos · confidence{" "}
            {state.confidence != null
              ? `${(state.confidence * 100).toFixed(0)}%`
              : "—"}
          </p>
          <dl className="mt-1.5 grid grid-cols-2 gap-1 text-[11.5px] text-emerald-800">
            {KPIS_EFM.map((k) => (
              <div key={k} className="flex justify-between">
                <dt>{ETIQUETA_KPI[k]}:</dt>
                <dd className="font-mono">
                  {state.kpis![k] != null
                    ? fmtMxn.format(state.kpis![k] as number)
                    : "—"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}

function ExtraerSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={disabled || pending}>
      {pending ? "Procesando…" : "Extraer"}
    </Button>
  );
}

function KPIsManualBlock({
  efmId,
  kpisActuales,
}: {
  efmId: string;
  kpisActuales: Record<KPIKey, number | null>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(
    actualizarKPIsManual,
    initialSimpleEFMState,
  );
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-[13.5px] font-semibold">
            <Pencil className="h-3.5 w-3.5 text-ink-2" />
            Capturar KPIs manualmente
          </h3>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            Sobrescribe los valores extraídos por IA si los detectaste mal o si
            no tienes el PDF.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Cerrar" : "Editar"}
        </Button>
      </header>

      {open && (
        <form action={formAction} className="mt-3 space-y-2">
          <input type="hidden" name="efm_id" value={efmId} />
          <div className="grid grid-cols-2 gap-2">
            {KPIS_EFM.map((k) => (
              <div key={k} className="space-y-0.5">
                <Label htmlFor={`kpi_${k}`} className="text-[11px]">
                  {ETIQUETA_KPI[k]}
                </Label>
                <Input
                  id={`kpi_${k}`}
                  name={k}
                  type="number"
                  step="0.01"
                  defaultValue={
                    kpisActuales[k] != null
                      ? String(kpisActuales[k])
                      : ""
                  }
                  className="h-9 font-mono"
                />
              </div>
            ))}
          </div>
          {state.error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
              {state.error}
            </p>
          )}
          <KPIsSubmit />
        </form>
      )}
    </section>
  );
}

function KPIsSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar KPIs"}
    </Button>
  );
}

function FirmadosBlock({
  efmId,
  firmados,
}: {
  efmId: string;
  firmados: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const onToggle = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("efm_id", efmId);
      fd.set("firmados", firmados ? "false" : "true");
      const res = await marcarFirmados({ ok: false, error: null }, fd);
      if (!res.ok) notify({ message: res.error ?? "Error", variant: "error" });
    });
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-[13.5px] font-semibold">
            <Stamp className="h-3.5 w-3.5 text-blue-700" />
            Firmado por el despacho contable
          </h3>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            Marca cuando recibas la versión firmada (PDF con sello). Solo
            informativo.
          </p>
        </div>
        <Button
          type="button"
          variant={firmados ? "outline" : "default"}
          size="sm"
          onClick={onToggle}
          disabled={isPending}
        >
          {firmados ? "Marcar sin firma" : "Marcar firmado"}
        </Button>
      </header>
    </section>
  );
}
