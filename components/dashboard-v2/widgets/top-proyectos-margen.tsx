import { TrendingUp } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

type Row = {
  proyecto_id: string;
  codigo: string;
  nombre: string;
  ingreso_presupuestado: number | null;
  margen_neto: number | null;
};

export async function TopProyectosMargen() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("v_proyecto_pnl_resumen")
    .select("proyecto_id, codigo, nombre, ingreso_presupuestado, margen_neto")
    .in("empresa_id", empresasFiltro)
    .gt("ingreso_presupuestado", 0)
    .order("margen_neto", { ascending: false })
    .limit(5)) as unknown as { data: Row[] | null };

  const top = data ?? [];

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-ok-deep" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Top proyectos por margen
        </span>
      </div>
      {top.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-ink-3">Sin proyectos con presupuesto.</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {top.map((p, i) => {
            const ing = Number(p.ingreso_presupuestado ?? 0);
            const m = Number(p.margen_neto ?? 0);
            const pct = ing > 0 ? (m / ing) * 100 : 0;
            return (
              <li key={p.proyecto_id}>
                <Link
                  href={`/proyectos/${p.proyecto_id}/pnl`}
                  className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-bg-2"
                >
                  <span className="font-mono text-[10.5px] text-ink-3 tnum">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">
                    {p.nombre}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-ok-deep tnum">
                    {pct.toFixed(1)}%
                  </span>
                  <span className="font-mono text-[10.5px] text-ink-3 tnum">
                    {fmtMxnCompact.format(m)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
