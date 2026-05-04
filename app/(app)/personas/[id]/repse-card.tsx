"use client";

import { ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDot } from "@/components/ui/status-dot";

import { actualizarRepse } from "./actions";

const fmtFecha = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

export function RepseCard({
  empleadoId,
  vigenciaActual,
  folioActual,
  puedeGestionar,
}: {
  empleadoId: string;
  vigenciaActual: string | null;
  folioActual: string | null;
  puedeGestionar: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [vigencia, setVigencia] = useState(vigenciaActual ?? "");
  const [folio, setFolio] = useState(folioActual ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hoy = new Date();
  const venc = vigenciaActual ? new Date(vigenciaActual) : null;
  const dias = venc
    ? Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const status = !venc
    ? "danger"
    : dias! < 0
      ? "danger"
      : dias! < 30
        ? "danger"
        : dias! < 90
          ? "warning"
          : "ok";
  const statusLabel = !venc
    ? "Sin constancia"
    : dias! < 0
      ? `Vencida hace ${Math.abs(dias!)} días`
      : dias! < 30
        ? `Urgente · ${dias} días`
        : dias! < 90
          ? `Próxima · ${dias} días`
          : `Vigente · ${dias} días`;

  function guardar() {
    if (!vigencia || !folio.trim()) {
      setError("Falta vigencia o folio.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await actualizarRepse(empleadoId, vigencia, folio.trim());
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEditing(false);
    });
  }

  return (
    <section className="rounded-md border border-border bg-card p-5 shadow-xs">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-ink-3" />
        <h2 className="text-[13.5px] font-semibold">Constancia REPSE</h2>
      </div>

      {!editing ? (
        <>
          <div className="flex items-center gap-2.5">
            <StatusDot status={status} size={10} />
            <span
              className={
                status === "danger"
                  ? "text-[13px] font-medium text-danger-deep"
                  : status === "warning"
                    ? "text-[13px] font-medium text-warn-deep"
                    : "text-[13px] font-medium"
              }
            >
              {statusLabel}
            </span>
          </div>

          <dl className="mt-3 space-y-2 text-[12.5px]">
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <dt className="text-ink-3">Vigencia hasta</dt>
              <dd className="font-medium">{fmtFecha(vigenciaActual)}</dd>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <dt className="text-ink-3">Folio</dt>
              <dd className="font-mono text-[11px]">{folioActual ?? "—"}</dd>
            </div>
          </dl>

          {puedeGestionar && (
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => setEditing(true)}
            >
              {vigenciaActual ? "Renovar constancia" : "Registrar constancia"}
            </Button>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="folio_repse">Folio</Label>
            <Input
              id="folio_repse"
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              placeholder="REPSE-XXXX-XXXX"
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vigencia_repse">Vigencia hasta</Label>
            <Input
              id="vigencia_repse"
              value={vigencia}
              onChange={(e) => setVigencia(e.target.value)}
              type="date"
            />
            <p className="text-[11px] text-ink-3">
              Las constancias REPSE típicamente duran 3 meses.
            </p>
          </div>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={guardar} disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
