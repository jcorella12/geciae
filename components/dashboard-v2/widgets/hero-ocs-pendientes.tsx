import { ClipboardCheck } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

export async function HeroOcsPendientes({
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
    .from("ordenes_compra")
    .select("id, total, folio", { count: "exact" })
    .eq("estado", "pendiente_aprobacion")
    .in("empresa_id", empresasFiltro)
    .order("created_at", { ascending: false })
    .limit(20)) as unknown as {
    data: { id: string; total: number; folio: string }[] | null;
    count: number | null;
  };

  const total = (data ?? []).reduce((acc, o) => acc + Number(o.total ?? 0), 0);

  return (
    <Link href="/finanzas/oc?estado=pendiente_aprobacion" className="block">
      <div className="flex items-center gap-1.5">
        <ClipboardCheck className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          OCs pendientes de aprobación
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum">
          {count ?? 0}
        </span>
        <span className="text-[12px] font-medium text-ink-3">en cola</span>
      </div>
      <p className="mt-2 text-[11px] text-ink-3">
        Suma {fmtMxnCompact.format(total)}
      </p>
    </Link>
  );
}
