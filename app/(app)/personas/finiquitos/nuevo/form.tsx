"use client";

import { Calculator, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcularConceptosFiniquito } from "@/lib/personas/finiquito-calc";

import { crearFiniquito } from "../actions";
import {
  CAMINOS_CIERRE,
  type FiniquitoConcepto,
  MOTIVOS_BAJA,
} from "../state";

type EmpleadoOpt = {
  id: string;
  nombre_completo: string;
  numero_empleado: string;
  puesto: string;
  fecha_ingreso: string;
  fecha_baja: string | null;
  salario_base: number;
  empresa_codigo: string;
  activo: boolean;
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

export function NuevoFiniquitoForm({
  empleados,
  empleadoPreseleccionado,
  codigoColor,
}: {
  empleados: EmpleadoOpt[];
  empleadoPreseleccionado: string | null;
  codigoColor: Record<string, string>;
}) {
  const router = useRouter();
  const [empleadoId, setEmpleadoId] = useState(
    empleadoPreseleccionado ?? "",
  );
  const [fechaBaja, setFechaBaja] = useState(() => {
    const e = empleados.find((x) => x.id === empleadoPreseleccionado);
    return e?.fecha_baja ?? new Date().toISOString().slice(0, 10);
  });
  const [motivoBaja, setMotivoBaja] = useState("renuncia_voluntaria");
  const [caminoCierre, setCaminoCierre] = useState<
    "privada" | "reforzada" | "ratificada"
  >("privada");
  const [diasVacDisfrutadas, setDiasVacDisfrutadas] = useState(0);
  const [ultimoPago, setUltimoPago] = useState("");
  const [pagaIndem3, setPagaIndem3] = useState(false);
  const [paga20DiasAnio, setPaga20DiasAnio] = useState(false);
  const [pagaPrimaAntig, setPagaPrimaAntig] = useState(false);

  const [conceptos, setConceptos] = useState<FiniquitoConcepto[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const empleado = useMemo(
    () => empleados.find((e) => e.id === empleadoId) ?? null,
    [empleados, empleadoId],
  );

  function calcular() {
    if (!empleado) {
      setError("Selecciona un empleado primero.");
      return;
    }
    if (empleado.salario_base <= 0) {
      setError(
        "Este empleado no tiene salario base capturado. Edítalo en su ficha antes de calcular.",
      );
      return;
    }
    setError(null);
    const sugeridos = calcularConceptosFiniquito({
      fechaIngreso: empleado.fecha_ingreso,
      fechaBaja,
      salarioBaseMensual: empleado.salario_base,
      diasVacacionesDisfrutadas: diasVacDisfrutadas,
      ultimoPagoFecha: ultimoPago || null,
      caminoCierre,
      motivoBaja,
      pagaIndemnizacion3Meses: pagaIndem3,
      paga20DiasPorAnio: paga20DiasAnio,
      pagaPrimaAntiguedad: pagaPrimaAntig,
    });
    setConceptos(sugeridos);
  }

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

  const total = useMemo(
    () => conceptos.reduce((acc, c) => acc + Number(c.monto || 0), 0),
    [conceptos],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!empleadoId) {
      setError("Selecciona un empleado.");
      return;
    }
    if (conceptos.length === 0) {
      setError("Agrega o calcula al menos un concepto.");
      return;
    }
    startTransition(async () => {
      const r = await crearFiniquito({
        empleadoId,
        fechaBaja,
        motivoBaja,
        caminoCierre,
        conceptos,
        observaciones: observaciones || null,
      });
      if (!r.ok || !r.id) {
        setError(r.error ?? "Error al crear finiquito");
        return;
      }
      router.push(`/personas/finiquitos/${r.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Selector empleado */}
      <section className="space-y-2 rounded-md border border-border bg-card p-5">
        <Label htmlFor="empleado">Empleado</Label>
        <select
          id="empleado"
          required
          value={empleadoId}
          onChange={(e) => setEmpleadoId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">— Selecciona —</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.empresa_codigo} · {e.numero_empleado} · {e.nombre_completo}
              {!e.activo ? " (baja)" : ""}
            </option>
          ))}
        </select>
        {empleado && (
          <div className="mt-3 rounded-md border border-border bg-bg-2 p-3 text-[12.5px]">
            <div className="flex items-center gap-2 font-medium">
              <span
                className={`inline-block h-2 w-2 rounded-full ${codigoColor[empleado.empresa_codigo] ?? "bg-muted-foreground"}`}
              />
              {empleado.nombre_completo}
              <span className="font-mono text-[11px] text-muted-foreground">
                {empleado.numero_empleado}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-3">
              <div>Puesto: <span className="text-foreground">{empleado.puesto || "—"}</span></div>
              <div>Ingreso: <span className="font-mono text-foreground">{empleado.fecha_ingreso}</span></div>
              <div>
                Salario base: <span className="font-mono text-foreground">{fmtMxn.format(empleado.salario_base)}</span>
              </div>
            </div>
            {empleado.salario_base <= 0 && (
              <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11.5px] text-amber-900">
                ⚠ Sin salario base capturado. Edítalo en la ficha del empleado antes de calcular.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Datos de la baja */}
      <section className="space-y-4 rounded-md border border-border bg-card p-5">
        <h2 className="text-[14px] font-semibold">Datos de la baja</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="fb">Fecha de baja</Label>
            <Input
              id="fb"
              type="date"
              required
              value={fechaBaja}
              onChange={(e) => setFechaBaja(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mb">Motivo</Label>
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
                setCaminoCierre(
                  e.target.value as "privada" | "reforzada" | "ratificada",
                )
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
        <p className="text-[11px] text-muted-foreground">
          {CAMINOS_CIERRE.find((c) => c.value === caminoCierre)?.ayuda}
        </p>
      </section>

      {/* Asistente de cálculo */}
      <section className="space-y-4 rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold">
            <Calculator className="h-4 w-4" />
            Asistente de cálculo
          </h2>
          <Button type="button" size="sm" onClick={calcular}>
            Calcular conceptos sugeridos
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="vd">Días vacaciones ya disfrutadas</Label>
            <Input
              id="vd"
              type="number"
              min="0"
              step="1"
              value={diasVacDisfrutadas}
              onChange={(e) =>
                setDiasVacDisfrutadas(Number(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="up">Fecha último pago de nómina</Label>
            <Input
              id="up"
              type="date"
              value={ultimoPago}
              onChange={(e) => setUltimoPago(e.target.value)}
            />
          </div>
        </div>

        {caminoCierre !== "privada" && (
          <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-[12px] font-medium text-amber-900">
              Indemnizaciones a otorgar
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={pagaIndem3}
                onChange={(e) => setPagaIndem3(e.target.checked)}
                className="h-4 w-4"
              />
              Indemnización 3 meses (90 días) — Art. 50 LFT
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={paga20DiasAnio}
                onChange={(e) => setPaga20DiasAnio(e.target.checked)}
                className="h-4 w-4"
              />
              20 días por año trabajado — Art. 50 LFT
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={pagaPrimaAntig}
                onChange={(e) => setPagaPrimaAntig(e.target.checked)}
                className="h-4 w-4"
              />
              Prima de antigüedad (12 días/año) — Art. 162 LFT
            </label>
          </div>
        )}
      </section>

      {/* Conceptos */}
      <section className="space-y-3 rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold">
            Conceptos del finiquito
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addConceptoManual}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Concepto manual
          </Button>
        </div>

        {conceptos.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
            Sin conceptos. Usa &quot;Calcular conceptos sugeridos&quot; o
            agrega uno manual.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Concepto</th>
                  <th className="px-2 py-1.5 font-medium">Detalle</th>
                  <th className="px-2 py-1.5 text-right font-medium">
                    Monto
                  </th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {conceptos.map((c, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">
                      <Input
                        value={c.label}
                        onChange={(e) =>
                          updateConcepto(i, { label: e.target.value })
                        }
                        className="h-8 text-[12.5px]"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        value={c.detalle ?? ""}
                        onChange={(e) =>
                          updateConcepto(i, { detalle: e.target.value })
                        }
                        placeholder="Días, fórmula, nota…"
                        className="h-8 text-[12px]"
                      />
                    </td>
                    <td className="px-2 py-1">
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
                    </td>
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
                  </tr>
                ))}
                <tr className="border-t-2 border-border bg-secondary/30 font-semibold">
                  <td colSpan={2} className="px-2 py-2 text-right">
                    Total neto
                  </td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums">
                    {fmtMxn.format(total)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Observaciones */}
      <section className="space-y-2 rounded-md border border-border bg-card p-5">
        <Label htmlFor="obs">Observaciones</Label>
        <textarea
          id="obs"
          rows={3}
          maxLength={2000}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Acuerdos especiales, notas internas, contexto del despido, etc."
          className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </section>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="ghost" type="button">
          <a href="/personas/finiquitos">Cancelar</a>
        </Button>
        <Button
          type="submit"
          disabled={pending || conceptos.length === 0 || !empleadoId}
        >
          {pending ? "Guardando…" : "Crear borrador"}
        </Button>
      </div>
    </form>
  );
}
