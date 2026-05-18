"use client";

import { Banknote, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";

import { vincularMovimientoACfdi } from "./sugerencias-actions";

type Sugerencia = {
  movimiento_id: string;
  cuenta_id: string;
  cuenta_alias: string;
  fecha: string;
  concepto: string;
  monto: number;
  tipo: "cargo" | "abono";
  similitud: number;
};

const fmtMxn = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Math.abs(n));

function fmtFecha(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export function SugerenciasBancarias({
  cfdiId,
  sugerencias,
  puedeOperar,
}: {
  cfdiId: string;
  sugerencias: Sugerencia[];
  puedeOperar: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (sugerencias.length === 0) return null;

  async function vincular(mov: Sugerencia) {
    if (
      !(await confirm(
        `¿Registrar pago de ${fmtMxn(mov.monto)} del ${fmtFecha(mov.fecha)} (${mov.cuenta_alias}) en este CFDI? El movimiento bancario quedará conciliado.`,
      ))
    )
      return;
    startTransition(async () => {
      const r = await vincularMovimientoACfdi({
        cfdiId,
        movimientoId: mov.movimiento_id,
      });
      if (!r.ok) {
        alert(`Error: ${r.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
        <Banknote className="h-4 w-4" />
        Posibles pagos en tu banco
      </h2>
      <p className="mt-1 text-[11.5px] text-emerald-800">
        Encontramos {sugerencias.length} movimiento(s) sin conciliar con
        monto, fecha y tipo compatibles. Vincúlalos si corresponden.
      </p>

      <div className="mt-3 space-y-1.5">
        {sugerencias.map((s) => (
          <div
            key={s.movimiento_id}
            className="flex flex-wrap items-center gap-3 rounded-md border border-emerald-200 bg-white px-3 py-2 text-[12.5px]"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium">{s.concepto || "(sin concepto)"}</div>
              <div className="text-[11px] text-ink-3">
                {s.cuenta_alias} · {fmtFecha(s.fecha)} ·{" "}
                <span className="capitalize">{s.tipo}</span>
              </div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="font-semibold">{fmtMxn(s.monto)}</div>
              <div className="text-[10.5px] text-ink-3">
                similitud {(s.similitud * 100).toFixed(0)}%
              </div>
            </div>
            {puedeOperar && (
              <Button
                size="sm"
                onClick={() => vincular(s)}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1 h-3.5 w-3.5" />
                )}
                Vincular
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
