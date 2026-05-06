import { FileCheck } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { pct } from "./_utils";

type ObligacionRow = {
  estado: string;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
};

export async function HeroCumplimientoSat({
  empresaId,
}: {
  empresaId?: string | null;
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = empresaId
    ? [empresaId]
    : Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("obligaciones_sat")
    .select("estado, fecha_vencimiento, fecha_pago")
    .in("empresa_id", empresasFiltro)
    .gte("fecha_vencimiento", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))) as unknown as {
    data: ObligacionRow[] | null;
  };

  const filas = data ?? [];
  const total = filas.length;
  const aTiempo = filas.filter(
    (o) =>
      (o.estado === "pagada" || o.estado === "presentada") &&
      o.fecha_pago &&
      o.fecha_vencimiento &&
      o.fecha_pago <= o.fecha_vencimiento,
  ).length;
  const cumplimiento = pct(aTiempo, total);

  const pendientes = filas.filter(
    (o) => o.estado === "pendiente" || o.estado === "en_proceso",
  ).length;

  return (
    <Link href="/finanzas/cumplimiento" className="block">
      <div className="flex items-center gap-1.5">
        <FileCheck className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Cumplimiento SAT
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum">
          {cumplimiento.toFixed(0)}%
        </span>
        <span className="text-[12px] font-medium text-ink-3">a tiempo</span>
      </div>
      <p className="mt-2 text-[11px] text-ink-3">
        {pendientes} pendiente{pendientes === 1 ? "" : "s"} · {total} obligaciones (12m)
      </p>
    </Link>
  );
}
