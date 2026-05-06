import { TrendingUp } from "lucide-react";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact, pct } from "./_utils";

type ResumenRow = {
  empresa_id: string;
  ingreso_presupuestado: number | null;
  costos_totales: number | null;
  margen_neto: number | null;
};

export async function HeroMargenConsolidado({
  empresaId,
}: {
  empresaId?: string | null;
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasUsuario = Array.from(new Set(v.map((x) => x.empresa_id)));
  const empresasFiltro = empresaId ? [empresaId] : empresasUsuario;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("v_proyecto_pnl_resumen")
    .select("empresa_id, ingreso_presupuestado, costos_totales, margen_neto")
    .in("empresa_id", empresasFiltro)) as unknown as { data: ResumenRow[] | null };

  const filas = data ?? [];
  const ingresos = filas.reduce((acc, r) => acc + Number(r.ingreso_presupuestado ?? 0), 0);
  const costos = filas.reduce((acc, r) => acc + Number(r.costos_totales ?? 0), 0);
  const margen = ingresos - costos;
  const margenPct = pct(margen, ingresos);

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Margen consolidado del grupo
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum">
          {margenPct.toFixed(1)}%
        </span>
        <span className="text-[12px] font-medium text-ink-3">margen</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3 text-[11px]">
        <div>
          <div className="text-ink-3">Ingresos</div>
          <div className="font-mono font-semibold">{fmtMxnCompact.format(ingresos)}</div>
        </div>
        <div>
          <div className="text-ink-3">Costos</div>
          <div className="font-mono font-semibold">{fmtMxnCompact.format(costos)}</div>
        </div>
        <div>
          <div className="text-ink-3">Margen</div>
          <div
            className={
              margen >= 0
                ? "font-mono font-semibold text-ok-deep"
                : "font-mono font-semibold text-danger-deep"
            }
          >
            {fmtMxnCompact.format(margen)}
          </div>
        </div>
      </div>
    </div>
  );
}
