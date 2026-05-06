import { Truck, Users } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export async function MiEquipoResumen({
  empresaId,
}: {
  empresaId?: string | null;
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = empresaId
    ? [empresaId]
    : Array.from(new Set(v.map((x) => x.empresa_id)));

  const [empleados, vehiculos] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("empleados")
      .select("id", { count: "exact", head: true })
      .eq("estado", "activo")
      .in("empresa_id", empresasFiltro),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("vehiculos")
      .select("id", { count: "exact", head: true })
      .eq("estatus", "activo")
      .in("empresa_id", empresasFiltro),
  ]);

  const numEmp = (empleados as { count: number | null }).count ?? 0;
  const numVeh = (vehiculos as { count: number | null }).count ?? 0;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Resumen de mi equipo
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/personas"
          className="rounded-md border border-border bg-bg-2 p-3 hover:bg-card"
        >
          <div className="flex items-center gap-1.5 text-ink-3">
            <Users className="h-3 w-3" />
            <span className="text-[10.5px] uppercase tracking-wide">Personas</span>
          </div>
          <div className="mt-1 font-mono text-[18px] font-semibold tnum">{numEmp}</div>
        </Link>
        <Link
          href="/activos"
          className="rounded-md border border-border bg-bg-2 p-3 hover:bg-card"
        >
          <div className="flex items-center gap-1.5 text-ink-3">
            <Truck className="h-3 w-3" />
            <span className="text-[10.5px] uppercase tracking-wide">Vehículos</span>
          </div>
          <div className="mt-1 font-mono text-[18px] font-semibold tnum">{numVeh}</div>
        </Link>
      </div>
    </div>
  );
}
