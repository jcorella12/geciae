"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  ejecutarCierreMes,
  previewCierreMes,
  reabrirMes,
  type PreviewResultado,
} from "./actions";

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmt(n: number) {
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PreviewCliente({ empresas }: { empresas: Empresa[] }) {
  const today = new Date();
  const [empresaId, setEmpresaId] = useState<string>(empresas[0]?.id ?? "");
  const [anio, setAnio] = useState<number>(today.getFullYear());
  const [mes, setMes] = useState<number>(today.getMonth() + 1);
  const [preview, setPreview] = useState<PreviewResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [motivo, setMotivo] = useState("");

  function ejecutarPreview() {
    setError(null);
    setPreview(null);
    startTransition(async () => {
      const r = await previewCierreMes(empresaId, anio, mes);
      if (!r.ok) setError(r.error ?? "Error en preview.");
      setPreview(r);
    });
  }

  async function handleEjecutarCierre() {
    if (!preview) return;
    const fd = new FormData();
    fd.set("empresa_id", empresaId);
    fd.set("anio", String(anio));
    fd.set("mes", String(mes));
    startTransition(async () => {
      const r = await ejecutarCierreMes(
        { ok: false, error: null },
        fd,
      );
      if (!r.ok) {
        setError(r.error ?? "Error al cerrar.");
      } else {
        setConfirmandoCierre(false);
        // Refresh preview
        ejecutarPreview();
      }
    });
  }

  async function handleReabrir() {
    if (motivo.trim().length < 10) {
      setError("El motivo debe tener al menos 10 caracteres.");
      return;
    }
    const fd = new FormData();
    fd.set("empresa_id", empresaId);
    fd.set("anio", String(anio));
    fd.set("mes", String(mes));
    fd.set("motivo", motivo);
    startTransition(async () => {
      const r = await reabrirMes({ ok: false, error: null }, fd);
      if (!r.ok) {
        setError(r.error ?? "Error al reabrir.");
      } else {
        setReabriendo(false);
        setMotivo("");
        ejecutarPreview();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Selector */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="empresa">Empresa</Label>
            <select
              id="empresa"
              value={empresaId}
              onChange={(e) => {
                setEmpresaId(e.target.value);
                setPreview(null);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} — {e.nombre_comercial ?? e.razon_social}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anio">Año</Label>
            <Input
              id="anio"
              type="number"
              min={2020}
              max={2099}
              value={anio}
              onChange={(e) => {
                setAnio(Number(e.target.value));
                setPreview(null);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mes">Mes</Label>
            <select
              id="mes"
              value={mes}
              onChange={(e) => {
                setMes(Number(e.target.value));
                setPreview(null);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {NOMBRES_MESES.map((nombre, i) => (
                <option key={i + 1} value={i + 1}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={ejecutarPreview} disabled={isPending}>
            {isPending && !preview ? "Calculando…" : "Calcular preview"}
          </Button>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Resultado */}
      {preview?.ok && (
        <>
          {preview.cerrado && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-900">
                Mes ya cerrado
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Para re-ejecutar el reparto necesitas reabrir el mes con
                motivo (auditoría).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!reabriendo ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReabriendo(true)}
                  >
                    Reabrir mes…
                  </Button>
                ) : (
                  <div className="w-full space-y-2">
                    <Label htmlFor="motivo">
                      Motivo de re-apertura (mín. 10 chars)
                    </Label>
                    <textarea
                      id="motivo"
                      rows={3}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Ej: Se detectó OC pagada el día 30 que no estaba registrada cuando se cerró."
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleReabrir}
                        disabled={isPending}
                      >
                        Confirmar reapertura
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReabriendo(false);
                          setMotivo("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                Advertencias ({preview.warnings.length})
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Totales por CC */}
          <section>
            <h2 className="mb-3 text-base font-semibold">
              Totales por servicio compartido
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/50">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">Centro</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                    <th className="px-4 py-2 text-right font-medium">
                      Repartido
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      Diferencia
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.totalesPorCC.map((t) => (
                    <tr key={t.centro_id} className="hover:bg-secondary/30">
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs">{t.codigo}</span>
                        <span className="ml-2">{t.nombre}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                        {fmt(t.total)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                        {fmt(t.repartido)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-mono text-xs tabular-nums ${
                          Math.abs(t.diferencia) > 0.01
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {fmt(t.diferencia)}
                      </td>
                    </tr>
                  ))}
                  {preview.totalesPorCC.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-sm text-muted-foreground"
                      >
                        Sin servicios compartidos con movimientos en este mes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Movimientos a generar */}
          <section>
            <h2 className="mb-3 text-base font-semibold">
              Movimientos que se generarán ({preview.movimientos.length})
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/50">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">Origen</th>
                    <th className="px-4 py-2 font-medium">→ Destino</th>
                    <th className="px-4 py-2 font-medium">Método</th>
                    <th className="px-4 py-2 text-right font-medium">Monto</th>
                    <th className="px-4 py-2 font-medium">Emisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.movimientos.map((m, i) => (
                    <tr key={i} className="hover:bg-secondary/30">
                      <td className="px-4 py-2 text-xs">
                        <span className="font-mono">{m.centro_origen_codigo}</span>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <span className="font-medium">
                          {m.empresa_destino_codigo}
                        </span>
                        {m.centro_destino_codigo && (
                          <span className="ml-1 font-mono text-muted-foreground">
                            / {m.centro_destino_codigo}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs">{m.metodo}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                        {fmt(m.monto_calculado)}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {m.emision === "cfdi_inter_co" ? "CFDI" : "asiento"}
                      </td>
                    </tr>
                  ))}
                  {preview.movimientos.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-muted-foreground"
                      >
                        Sin movimientos a generar (no hay CCs con monto y reglas vigentes).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Ejecutar */}
          {!preview.cerrado && preview.movimientos.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold">Ejecutar cierre</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Genera los movimientos de reparto y marca el mes como cerrado.
                Después no se podrán modificar movimientos del mes hasta reabrir.
              </p>
              <div className="mt-3">
                {!confirmandoCierre ? (
                  <Button onClick={() => setConfirmandoCierre(true)}>
                    Cerrar mes…
                  </Button>
                ) : (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
                    <p className="text-sm">
                      ¿Confirmas cerrar{" "}
                      <strong>
                        {NOMBRES_MESES[mes - 1]} {anio}
                      </strong>{" "}
                      para esta empresa?
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={handleEjecutarCierre}
                        disabled={isPending}
                      >
                        {isPending ? "Cerrando…" : "Confirmar cierre"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmandoCierre(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
