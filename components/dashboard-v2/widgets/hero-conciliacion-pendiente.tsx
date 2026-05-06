import { AlertCircle } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

export async function HeroConciliacionPendiente({
  empresaId,
}: {
  empresaId?: string | null;
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = empresaId
    ? [empresaId]
    : Array.from(new Set(v.map((x) => x.empresa_id)));

  // Cuentas de las empresas filtradas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cuentas } = (await (supabase as any)
    .from("bancos_cuentas")
    .select("id")
    .in("empresa_id", empresasFiltro)) as unknown as {
    data: { id: string }[] | null;
  };

  const cuentaIds = (cuentas ?? []).map((c) => c.id);
  if (cuentaIds.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-ink-3" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Conciliación bancaria
          </span>
        </div>
        <p className="mt-3 text-[12px] text-ink-3">Sin cuentas bancarias activas.</p>
      </div>
    );
  }

  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: movs, count } = (await (supabase as any)
    .from("bancos_movimientos")
    .select("monto", { count: "exact" })
    .eq("conciliado", false)
    .gte("fecha", desde)
    .in("cuenta_id", cuentaIds)) as unknown as {
    data: { monto: number }[] | null;
    count: number | null;
  };

  const total = (movs ?? []).reduce(
    (acc, m) => acc + Math.abs(Number(m.monto ?? 0)),
    0,
  );

  return (
    <Link href="/finanzas/tesoreria/cuentas" className="block">
      <div className="flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Conciliación pendiente
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum">
          {count ?? 0}
        </span>
        <span className="text-[12px] font-medium text-ink-3">movimientos</span>
      </div>
      <p className="mt-2 text-[11px] text-ink-3">
        Últimos 30 días · {fmtMxnCompact.format(total)}
      </p>
    </Link>
  );
}
