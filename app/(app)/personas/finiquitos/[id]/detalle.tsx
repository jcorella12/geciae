"use client";

import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  actualizarFiniquito,
  aprobarFiniquito,
  eliminarFiniquito,
  marcarPagado,
  marcarRatificado,
} from "../actions";
import {
  CAMINOS_CIERRE,
  type CaminoCierre,
  type EstadoFiniquito,
  type FiniquitoConcepto,
  MOTIVOS_BAJA,
} from "../state";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const motivoLabel = (v: string) =>
  MOTIVOS_BAJA.find((m) => m.value === v)?.label ?? v;

const badgeEstado = (estado: EstadoFiniquito) => {
  switch (estado) {
    case "borrador":
      return "bg-slate-100 text-slate-700";
    case "aprobado":
      return "bg-amber-100 text-amber-800";
    case "pagado":
      return "bg-emerald-100 text-emerald-800";
    case "ratificado":
      return "bg-blue-100 text-blue-800";
  }
};

const ESTADOS_LABEL: Record<EstadoFiniquito, string> = {
  borrador: "Borrador",
  aprobado: "Aprobado",
  pagado: "Pagado",
  ratificado: "Ratificado",
};

type FiniquitoData = {
  id: string;
  empleadoId: string;
  fechaBaja: string;
  motivoBaja: string;
  caminoCierre: CaminoCierre | null;
  conceptos: FiniquitoConcepto[];
  totalNeto: number;
  urlConvenioTerminacion: string | null;
  urlReciboFiniquito: string | null;
  fechaPago: string | null;
  estado: EstadoFiniquito;
  observaciones: string | null;
};

type EmpleadoLite = {
  nombreCompleto: string;
  numeroEmpleado: string;
  salarioBase: number;
};

export function FiniquitoDetalle({
  finiquito,
  empleado,
  puedeGestionar,
}: {
  finiquito: FiniquitoData;
  empleado: EmpleadoLite;
  puedeGestionar: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  // Estado editable (solo se commit-tea al guardar)
  const [conceptos, setConceptos] = useState<FiniquitoConcepto[]>(
    finiquito.conceptos,
  );
  const [motivoBaja, setMotivoBaja] = useState(finiquito.motivoBaja);
  const [caminoCierre, setCaminoCierre] = useState<CaminoCierre>(
    finiquito.caminoCierre ?? "privada",
  );
  const [observaciones, setObservaciones] = useState(
    finiquito.observaciones ?? "",
  );

  const [fechaPago, setFechaPago] = useState(
    finiquito.fechaPago ?? new Date().toISOString().slice(0, 10),
  );
  const [showFechaPago, setShowFechaPago] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = conceptos.reduce(
    (acc, c) => acc + Number(c.monto || 0),
    0,
  );

  const esBorrador = finiquito.estado === "borrador";
  const esAprobado = finiquito.estado === "aprobado";
  const esPagado = finiquito.estado === "pagado";

  function updateConcepto(i: number, patch: Partial<FiniquitoConcepto>) {
    setConceptos((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    );
  }

  function removeConcepto(i: number) {
    setConceptos((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addConceptoManual() {
    setConceptos((prev) => [
      ...prev,
      {
        key: `manual_${Date.now()}`,
        label: "Concepto manual",
        monto: 0,
        detalle: "",
      },
    ]);
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      const r = await actualizarFiniquito({
        finiquitoId: finiquito.id,
        conceptos,
        observaciones: observaciones || null,
        motivoBaja,
        caminoCierre,
      });
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function cancelarEdit() {
    setConceptos(finiquito.conceptos);
    setMotivoBaja(finiquito.motivoBaja);
    setCaminoCierre(finiquito.caminoCierre ?? "privada");
    setObservaciones(finiquito.observaciones ?? "");
    setEditing(false);
    setError(null);
  }

  async function aprobar() {
    if (
      !(await confirm("¿Aprobar este finiquito? Ya no se podrá editar."))
    )
      return;
    setError(null);
    startTransition(async () => {
      const r = await aprobarFiniquito(finiquito.id);
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      router.refresh();
    });
  }

  function pagar() {
    setError(null);
    startTransition(async () => {
      const r = await marcarPagado(finiquito.id, fechaPago);
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      setShowFechaPago(false);
      router.refresh();
    });
  }

  async function ratificar() {
    if (
      !(await confirm(
        "¿Marcar como ratificado ante Centro de Conciliación? Solo después de la audiencia.",
      ))
    )
      return;
    setError(null);
    startTransition(async () => {
      const r = await marcarRatificado(finiquito.id);
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      router.refresh();
    });
  }

  async function eliminar() {
    if (
      !(await confirm({
        message: "¿Eliminar este finiquito en borrador? No se puede deshacer.",
        danger: true,
        confirmLabel: "Eliminar",
      }))
    )
      return;
    setError(null);
    startTransition(async () => {
      const r = await eliminarFiniquito(finiquito.id);
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      router.push("/personas/finiquitos");
    });
  }

  return (
    <div className="space-y-6">
      {/* Estado + acciones primarias */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[12.5px] font-medium ${badgeEstado(finiquito.estado)}`}
          >
            {ESTADOS_LABEL[finiquito.estado]}
          </span>
          <div className="text-[12.5px] text-muted-foreground">
            <div>
              Baja: <span className="font-mono text-foreground">{finiquito.fechaBaja}</span> · {motivoLabel(finiquito.motivoBaja)}
            </div>
            {finiquito.fechaPago && (
              <div className="mt-0.5">
                Pagado: <span className="font-mono text-foreground">{finiquito.fechaPago}</span>
              </div>
            )}
          </div>
        </div>
        {puedeGestionar && (
          <div className="flex flex-wrap gap-2">
            {esBorrador && !editing && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button size="sm" onClick={aprobar} disabled={pending}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={eliminar}
                  disabled={pending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {esAprobado && (
              <Button
                size="sm"
                onClick={() => setShowFechaPago(true)}
                disabled={pending}
              >
                Marcar pagado
              </Button>
            )}
            {esPagado && finiquito.caminoCierre !== "ratificada" && (
              <Button
                size="sm"
                variant="outline"
                onClick={ratificar}
                disabled={pending}
              >
                Marcar ratificado (CCL)
              </Button>
            )}
          </div>
        )}
      </section>

      {showFechaPago && (
        <section className="rounded-md border border-emerald-300 bg-emerald-50 p-4">
          <Label htmlFor="fp" className="text-[12.5px]">
            Fecha de pago (transferencia / cheque)
          </Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="fp"
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className="max-w-[200px]"
            />
            <Button size="sm" onClick={pagar} disabled={pending}>
              Confirmar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFechaPago(false)}
            >
              Cancelar
            </Button>
          </div>
        </section>
      )}

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Datos editables (solo en borrador + editing) */}
      {editing && (
        <section className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mb">Motivo de baja</Label>
              <select
                id="mb"
                value={motivoBaja}
                onChange={(e) => setMotivoBaja(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {MOTIVOS_BAJA.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc">Camino de cierre</Label>
              <select
                id="cc"
                value={caminoCierre}
                onChange={(e) =>
                  setCaminoCierre(e.target.value as CaminoCierre)
                }
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {CAMINOS_CIERRE.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Conceptos */}
      <section className="space-y-3 rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold">Conceptos</h2>
          {editing && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addConceptoManual}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Agregar
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50 text-left">
              <tr>
                <th className="px-2 py-1.5 font-medium">Concepto</th>
                <th className="px-2 py-1.5 font-medium">Detalle</th>
                <th className="px-2 py-1.5 text-right font-medium">Monto</th>
                {editing && <th className="px-2 py-1.5"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {conceptos.map((c, i) => (
                <tr key={i}>
                  <td className="px-2 py-1">
                    {editing ? (
                      <Input
                        value={c.label}
                        onChange={(e) =>
                          updateConcepto(i, { label: e.target.value })
                        }
                        className="h-8 text-[12.5px]"
                      />
                    ) : (
                      <span className="text-[12.5px] font-medium">
                        {c.label}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-[11.5px] text-muted-foreground">
                    {editing ? (
                      <Input
                        value={c.detalle ?? ""}
                        onChange={(e) =>
                          updateConcepto(i, { detalle: e.target.value })
                        }
                        className="h-8 text-[12px]"
                      />
                    ) : (
                      c.detalle || "—"
                    )}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {editing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={c.monto}
                        onChange={(e) =>
                          updateConcepto(i, {
                            monto: Number(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-right font-mono text-[12.5px]"
                      />
                    ) : (
                      <span className="font-mono text-[12.5px] tabular-nums">
                        {fmtMxn.format(Number(c.monto))}
                      </span>
                    )}
                  </td>
                  {editing && (
                    <td className="px-2 py-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeConcepto(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-secondary/30 font-semibold">
                <td colSpan={2} className="px-2 py-2 text-right">
                  Total neto
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums">
                  {fmtMxn.format(total)}
                </td>
                {editing && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Observaciones */}
      <section className="space-y-2 rounded-md border border-border bg-card p-5">
        <Label htmlFor="obs">Observaciones</Label>
        {editing ? (
          <textarea
            id="obs"
            rows={3}
            maxLength={2000}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        ) : (
          <p className="whitespace-pre-wrap text-[13px] text-foreground">
            {finiquito.observaciones || "—"}
          </p>
        )}
      </section>

      {/* Adjuntos */}
      <section className="space-y-3 rounded-md border border-border bg-card p-5">
        <h2 className="text-[14px] font-semibold">Documentos</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DocBox
            label="Convenio de terminación"
            url={finiquito.urlConvenioTerminacion}
          />
          <DocBox
            label="Recibo de finiquito firmado"
            url={finiquito.urlReciboFiniquito}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Para subir un archivo, usa el storage de Supabase (bucket
          <code className="mx-1 font-mono">empleados</code>) y pega la URL
          aquí. Subida directa desde el navegador llegará en otra iteración.
        </p>
      </section>

      {/* Footer de edición */}
      {editing && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={cancelarEdit} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      )}

      {/* Datos derivados read-only */}
      <section className="text-[11px] text-muted-foreground">
        Empleado: {empleado.nombreCompleto} ·{" "}
        <span className="font-mono">{empleado.numeroEmpleado}</span> ·
        salario base: <span className="font-mono">{fmtMxn.format(empleado.salarioBase)}</span>
      </section>
    </div>
  );
}

function DocBox({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="rounded-md border border-border bg-bg-2 p-3">
      <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex items-center gap-1.5 text-[13px] text-brand hover:underline"
        >
          <FileText className="h-3.5 w-3.5" />
          Ver documento
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p className="mt-1 text-[12px] text-muted-foreground">Sin subir.</p>
      )}
    </div>
  );
}
