"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { facturarPrestamo, generarCfdiConsolidado } from "./actions";

type Empresa = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

/**
 * Botón para facturar un préstamo devuelto (crea movimientos de centros:
 * gasto en la empresa solicitante, ingreso en la propietaria, y marca el
 * préstamo como "facturado").
 */
export function BotonFacturar({ prestamoId }: { prestamoId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    start(async () => {
      const r = await facturarPrestamo(prestamoId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={onClick}
      >
        {pending ? "Facturando…" : "Facturar"}
      </Button>
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </span>
  );
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/**
 * Cierre mensual: genera un CFDI consolidado con todos los préstamos
 * facturados de un par emisora→receptora en un periodo. El consolidado queda
 * en estado "borrador" para revisión antes de timbrar.
 */
export function GenerarConsolidado({ empresas }: { empresas: Empresa[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [emisora, setEmisora] = useState("");
  const [receptora, setReceptora] = useState("");
  const ahora = new Date();
  // Por defecto el mes pasado (lo típico al hacer cierre).
  const mesPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const [anio, setAnio] = useState(mesPasado.getFullYear());
  const [mes, setMes] = useState(mesPasado.getMonth() + 1);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit() {
    setMsg(null);
    if (!emisora || !receptora) {
      setMsg({ ok: false, text: "Selecciona empresa emisora y receptora." });
      return;
    }
    if (emisora === receptora) {
      setMsg({ ok: false, text: "Emisora y receptora deben ser distintas." });
      return;
    }
    start(async () => {
      const r = await generarCfdiConsolidado(emisora, receptora, anio, mes);
      if (!r.ok) {
        setMsg({ ok: false, text: r.error ?? "Error al generar." });
        return;
      }
      setMsg({ ok: true, text: "Consolidado generado en borrador." });
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      <Button type="button" variant="outline" onClick={() => setAbierto(true)}>
        Cierre mensual…
      </Button>
    );
  }

  const selectCls =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Generar CFDI consolidado</h3>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs text-ink-3 hover:text-ink-1"
        >
          Cerrar
        </button>
      </div>
      <p className="mb-3 text-[11px] text-ink-3">
        Agrupa los préstamos facturados del periodo (de una empresa a otra) en
        un CFDI consolidado. Queda en borrador para revisar antes de timbrar.
      </p>
      <div className="space-y-2">
        <div>
          <label className="text-[11px] text-ink-3">Empresa que cobra (emisora)</label>
          <select
            value={emisora}
            onChange={(e) => setEmisora(e.target.value)}
            className={selectCls}
          >
            <option value="">— Selecciona —</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} · {e.nombre_comercial ?? e.razon_social}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-ink-3">Empresa que paga (receptora)</label>
          <select
            value={receptora}
            onChange={(e) => setReceptora(e.target.value)}
            className={selectCls}
          >
            <option value="">— Selecciona —</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} · {e.nombre_comercial ?? e.razon_social}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] text-ink-3">Mes</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className={selectCls}
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="text-[11px] text-ink-3">Año</label>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className={selectCls}
            >
              {[ahora.getFullYear(), ahora.getFullYear() - 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {msg && (
        <p
          className={`mt-2 text-[11px] ${
            msg.ok ? "text-emerald-600" : "text-destructive"
          }`}
        >
          {msg.text}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <Button type="button" disabled={pending} onClick={onSubmit}>
          {pending ? "Generando…" : "Generar consolidado"}
        </Button>
      </div>
    </div>
  );
}
