import { Banknote } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

export async function TesoreriaResumen() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = Array.from(new Set(v.map((x) => x.empresa_id)));

  const [cuentas, prestamos] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("bancos_cuentas")
      .select("saldo_actual")
      .eq("activa", true)
      .in("empresa_id", empresasFiltro),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("prestamos")
      .select("monto_original, saldo_actual, intereses_devengados_mes")
      .eq("estado", "activo")
      .in("empresa_id", empresasFiltro)
      .then(
        (r: unknown) => r,
        () => ({ data: [] }),
      ),
  ]);

  const cash = ((cuentas as { data: { saldo_actual: number | null }[] | null }).data ?? []).reduce(
    (acc, c) => acc + Number(c.saldo_actual ?? 0),
    0,
  );

  const prestamosData = (
    prestamos as {
      data:
        | { saldo_actual: number; intereses_devengados_mes: number | null }[]
        | null;
    }
  ).data ?? [];
  const deuda = prestamosData.reduce((acc, p) => acc + Number(p.saldo_actual ?? 0), 0);
  const intereses = prestamosData.reduce(
    (acc, p) => acc + Number(p.intereses_devengados_mes ?? 0),
    0,
  );

  return (
    <Link href="/finanzas/tesoreria" className="block">
      <div className="flex items-center gap-1.5">
        <Banknote className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Resumen tesorería
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-ink-3">Cash</div>
          <div className="mt-1 font-mono text-[14px] font-semibold tnum">
            {fmtMxnCompact.format(cash)}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-ink-3">Deuda</div>
          <div className="mt-1 font-mono text-[14px] font-semibold text-danger-deep tnum">
            {fmtMxnCompact.format(deuda)}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-ink-3">Intereses mes</div>
          <div className="mt-1 font-mono text-[14px] font-semibold text-warn-deep tnum">
            {fmtMxnCompact.format(intereses)}
          </div>
        </div>
      </div>
    </Link>
  );
}
