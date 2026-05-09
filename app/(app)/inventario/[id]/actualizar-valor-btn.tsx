"use client";

import { TrendingUp } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  actualizarValorMercado,
  type UnidadValorMercado,
} from "../actions";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});
const fmtUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const ETIQUETA: Record<UnidadValorMercado, string> = {
  mxn_unidad: "MXN / unidad",
  usd_unidad: "USD / unidad",
  usd_watt: "USD / watt",
};

const PLACEHOLDER: Record<UnidadValorMercado, string> = {
  mxn_unidad: "1500.00",
  usd_unidad: "85.50",
  usd_watt: "0.135",
};

export function ActualizarValorBtn({
  itemId,
  empresaId,
  valorActual,
  fuenteActual,
  capacidadW,
  tcActual,
}: {
  itemId: string;
  empresaId: string | null;
  /** valor canónico MXN/unidad actual (sin importar la unidad de captura) */
  valorActual: number | null;
  fuenteActual: string | null;
  /** capacidad del producto en watts (W). Si null, no se puede usar USD/watt. */
  capacidadW: number | null;
  /** TC USD/MXN actual (de tipo_cambio_actual()), usado para preview */
  tcActual: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [unidad, setUnidad] = useState<UnidadValorMercado>("mxn_unidad");
  const [valor, setValor] = useState<string>("");
  const [fuente, setFuente] = useState<string>(fuenteActual ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Limpiar input al cambiar de unidad
  useEffect(() => {
    setValor("");
    setError(null);
  }, [unidad]);

  function abrir() {
    setOpen(true);
    setUnidad("mxn_unidad");
    setValor("");
    setError(null);
  }

  function guardar() {
    setError(null);
    const num = parseFloat(valor);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Valor inválido.");
      return;
    }
    if (unidad === "usd_watt" && !capacidadW) {
      setError(
        "Este producto no tiene capacidad registrada en W/kW; no se puede usar USD/watt.",
      );
      return;
    }
    startTransition(async () => {
      const r = await actualizarValorMercado(
        itemId,
        empresaId,
        num,
        fuente.trim() || null,
        unidad,
      );
      if (!r.ok) {
        setError(r.error ?? "Error");
      } else {
        setOpen(false);
      }
    });
  }

  // Preview en MXN/unidad según unidad seleccionada
  const num = parseFloat(valor);
  let mxnUnidadPreview: number | null = null;
  let usdUnidadPreview: number | null = null;
  if (Number.isFinite(num) && num > 0) {
    if (unidad === "mxn_unidad") {
      mxnUnidadPreview = num;
      if (tcActual) usdUnidadPreview = num / tcActual;
    } else if (unidad === "usd_unidad") {
      usdUnidadPreview = num;
      if (tcActual) mxnUnidadPreview = num * tcActual;
    } else if (unidad === "usd_watt" && capacidadW && tcActual) {
      const usdU = num * capacidadW;
      usdUnidadPreview = usdU;
      mxnUnidadPreview = usdU * tcActual;
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={abrir}>
        <TrendingUp className="h-3.5 w-3.5" />
        Actualizar valor mercado
      </Button>
    );
  }

  const unidades: UnidadValorMercado[] = ["mxn_unidad", "usd_unidad", "usd_watt"];

  return (
    <div className="rounded-md border border-brand bg-brand-soft/30 p-3 w-full max-w-2xl">
      <div className="mb-2 text-[12px] font-semibold">
        Actualizar valor de mercado
      </div>

      {/* Selector de unidad */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {unidades.map((u) => {
          const disabled = u === "usd_watt" && !capacidadW;
          return (
            <button
              key={u}
              type="button"
              disabled={disabled}
              onClick={() => setUnidad(u)}
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium border transition-colors ${
                unidad === u
                  ? "border-brand bg-brand text-brand-fg"
                  : disabled
                    ? "border-border bg-bg-2 text-ink-4 cursor-not-allowed"
                    : "border-border bg-card text-ink-2 hover:border-brand/40"
              }`}
              title={disabled ? "Producto sin capacidad W/kW registrada" : ""}
            >
              {ETIQUETA[u]}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
        <div>
          <Label className="text-[11px]">Valor ({ETIQUETA[unidad]})</Label>
          <Input
            type="number"
            step="any"
            min="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={PLACEHOLDER[unidad]}
            autoFocus
            className="mt-0.5 text-sm tnum"
          />
        </div>
        <div>
          <Label className="text-[11px]">Fuente (opcional)</Label>
          <Input
            value={fuente}
            onChange={(e) => setFuente(e.target.value)}
            placeholder="Cotización proveedor X, mercado spot, etc."
            className="mt-0.5 text-sm"
          />
        </div>
        <div className="flex items-end gap-1.5">
          <Button size="sm" onClick={guardar} disabled={pending}>
            {pending ? "…" : "Guardar"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            disabled={pending}
          >
            Cancelar
          </Button>
        </div>
      </div>

      {/* Preview de conversiones */}
      {mxnUnidadPreview !== null && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-card border border-border p-2 text-[11.5px] sm:grid-cols-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ink-3">MXN / unidad</div>
            <div className="font-mono font-semibold tnum">
              {fmtMxn.format(mxnUnidadPreview)}
            </div>
          </div>
          {usdUnidadPreview !== null && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ink-3">USD / unidad</div>
              <div className="font-mono font-semibold tnum">
                {fmtUsd.format(usdUnidadPreview)}
              </div>
            </div>
          )}
          {capacidadW && usdUnidadPreview !== null && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ink-3">USD / watt</div>
              <div className="font-mono font-semibold tnum">
                {fmtUsd.format(usdUnidadPreview / capacidadW)}
              </div>
            </div>
          )}
          {tcActual && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ink-3">TC usado</div>
              <div className="font-mono tnum">${tcActual.toFixed(4)}</div>
            </div>
          )}
        </div>
      )}

      {valorActual !== null && valorActual > 0 && (
        <p className="mt-2 text-[11px] text-ink-3">
          Valor actual: <span className="font-mono tnum">{fmtMxn.format(valorActual)}</span> /
          unidad
        </p>
      )}

      {error && <p className="mt-2 text-[11px] text-danger-deep">{error}</p>}
    </div>
  );
}
