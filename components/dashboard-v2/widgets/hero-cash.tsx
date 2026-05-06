import { Banknote } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

type CuentaRow = {
  empresa_id: string;
  saldo_actual: number | null;
  moneda: string | null;
};

async function fetchCash(empresasFiltro: string[]) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("bancos_cuentas")
    .select("empresa_id, saldo_actual, moneda")
    .eq("activa", true)
    .in("empresa_id", empresasFiltro)) as unknown as { data: CuentaRow[] | null };

  const cuentas = (data ?? []).filter((c) => (c.moneda ?? "MXN") === "MXN");
  const total = cuentas.reduce((acc, c) => acc + Number(c.saldo_actual ?? 0), 0);
  return { total, count: cuentas.length };
}

export async function HeroCashGrupo() {
  const v = await obtenerVinculos();
  const empresasUsuario = Array.from(new Set(v.map((x) => x.empresa_id)));
  const { total, count } = await fetchCash(empresasUsuario);

  return (
    <Link href="/finanzas/tesoreria/cuentas" className="block">
      <div className="flex items-center gap-1.5">
        <Banknote className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Cash del grupo
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum">
          {fmtMxnCompact.format(total)}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-ink-3">
        {count} cuenta{count === 1 ? "" : "s"} activas en MXN
      </p>
    </Link>
  );
}

export async function HeroCashEmpresa({
  empresaId,
}: {
  empresaId?: string | null;
}) {
  if (!empresaId) {
    return (
      <div className="text-[12px] text-ink-3">
        Selecciona una empresa específica para ver su cash.
      </div>
    );
  }

  const { total, count } = await fetchCash([empresaId]);

  return (
    <Link href="/finanzas/tesoreria/cuentas" className="block">
      <div className="flex items-center gap-1.5">
        <Banknote className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Cash de mi empresa
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum">
          {fmtMxnCompact.format(total)}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-ink-3">
        {count} cuenta{count === 1 ? "" : "s"} activas
      </p>
    </Link>
  );
}
