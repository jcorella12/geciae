"use client";

import { Check, Link2, Unlink } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  conciliarConCFDI,
  conciliarConOC,
  desconciliar,
  marcarConciliadoSinCFDI,
} from "./actions";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export type Sugerencia = {
  tipo: "cfdi" | "oc";
  match_id: string;
  numero_o_folio: string;
  contraparte: string;
  monto: number;
  fecha: string;
  similitud: number;
};

export function MovimientoAcciones({
  movimientoId,
  conciliado,
  cfdiId,
  ocId,
  cfdiInfo,
  ocInfo,
  sugerencias,
}: {
  movimientoId: string;
  conciliado: boolean;
  cfdiId: string | null;
  ocId: string | null;
  cfdiInfo: { serie: string | null; folio: string | null } | null;
  ocInfo: { numero: string } | null;
  sugerencias: Sugerencia[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [showManual, setShowManual] = useState(false);
  const [notas, setNotas] = useState("");

  function vincular(s: Sugerencia) {
    start(async () => {
      const r =
        s.tipo === "cfdi"
          ? await conciliarConCFDI(movimientoId, s.match_id)
          : await conciliarConOC(movimientoId, s.match_id);
      if (!r.ok) alert(`Error: ${r.error}`);
      else setOpen(false);
    });
  }

  async function deshacer() {
    if (!(await confirm("¿Desconciliar este movimiento?"))) return;
    start(async () => {
      const r = await desconciliar(movimientoId);
      if (!r.ok) alert(`Error: ${r.error}`);
    });
  }

  function marcarManual() {
    start(async () => {
      const r = await marcarConciliadoSinCFDI(movimientoId, notas);
      if (!r.ok) alert(`Error: ${r.error}`);
      else {
        setShowManual(false);
        setNotas("");
        setOpen(false);
      }
    });
  }

  if (conciliado) {
    return (
      <div className="flex items-center gap-2">
        {cfdiInfo && cfdiId && (
          <Link
            href={`/finanzas/cfdi/${cfdiId}`}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <Check className="h-3 w-3" />
            CFDI {cfdiInfo.serie ?? ""}
            {cfdiInfo.folio ?? ""}
          </Link>
        )}
        {ocInfo && ocId && (
          <Link
            href={`/finanzas/oc/${ocId}`}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
          >
            <Check className="h-3 w-3" />
            OC {ocInfo.numero}
          </Link>
        )}
        {!cfdiInfo && !ocInfo && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
            <Check className="h-3 w-3" />
            Conciliado
          </span>
        )}
        <button
          type="button"
          onClick={deshacer}
          disabled={pending}
          className="text-ink-3 hover:text-danger"
          title="Desconciliar"
          aria-label="Desconciliar"
        >
          <Unlink className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-2 px-2 py-1 text-[11px] font-medium hover:bg-bg-3"
      >
        <Link2 className="h-3 w-3" />
        Conciliar
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-[28rem] rounded-md border border-border bg-card p-3 shadow-md">
          {sugerencias.length === 0 ? (
            <p className="text-[12px] text-ink-3">
              Sin coincidencias automáticas (por monto + fecha ±15 días).
            </p>
          ) : (
            <>
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Sugerencias
              </p>
              <ul className="space-y-1">
                {sugerencias.map((s) => (
                  <li key={`${s.tipo}-${s.match_id}`}>
                    <button
                      type="button"
                      onClick={() => vincular(s)}
                      disabled={pending}
                      className="flex w-full items-center gap-2 rounded-md border border-border bg-bg-1 px-3 py-2 text-left text-[12px] hover:border-brand"
                    >
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          s.tipo === "cfdi"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {s.tipo}
                      </span>
                      <span className="flex-1">
                        <span className="font-medium">{s.numero_o_folio}</span>
                        <span className="ml-1 text-ink-3">
                          · {s.contraparte}
                        </span>
                      </span>
                      <span className="font-mono tnum">
                        {fmtMxn.format(s.monto)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-3 border-t border-divider pt-3">
            {!showManual ? (
              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="text-[11.5px] text-ink-3 hover:text-ink-1"
              >
                Marcar conciliado sin CFDI/OC →
              </button>
            ) : (
              <div className="space-y-2">
                <Label
                  htmlFor={`notas-${movimientoId}`}
                  className="text-[11px]"
                >
                  Notas (opcional)
                </Label>
                <Input
                  id={`notas-${movimientoId}`}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Comisión bancaria, traspaso interno, etc."
                  className="h-8 text-[12px]"
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={marcarManual} disabled={pending}>
                    {pending ? "..." : "Marcar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowManual(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 w-full text-center text-[11px] text-ink-3 hover:text-ink-1"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
