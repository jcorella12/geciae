import { AlertCircle } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

export async function HeroCfdisSinCentro({
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
  const { data, count } = (await (supabase as any)
    .from("cfdi")
    .select("id, total", { count: "exact" })
    .is("centro_id", null)
    .is("proyecto_id", null)
    .eq("tipo", "egreso")
    .in("empresa_id", empresasFiltro)
    .limit(50)) as unknown as {
    data: { id: string; total: number }[] | null;
    count: number | null;
  };

  const monto = (data ?? []).reduce((acc, c) => acc + Number(c.total ?? 0), 0);

  return (
    <Link href="/finanzas/cfdi?sin_centro=1" className="block">
      <div className="flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 text-warn-deep" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          CFDIs sin centro asignado
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum">
          {count ?? 0}
        </span>
        <span className="text-[12px] font-medium text-ink-3">por clasificar</span>
      </div>
      <p className="mt-2 text-[11px] text-ink-3">
        Suma {fmtMxnCompact.format(monto)}
      </p>
    </Link>
  );
}
