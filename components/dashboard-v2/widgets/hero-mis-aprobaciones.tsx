import { ClipboardCheck } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export async function HeroMisAprobaciones() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  // OCs pendientes (todas las empresas donde el user tiene visibilidad)
  const ocsPromise = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("ordenes_compra")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente_aprobacion")
      .in("empresa_id", empresasIds)
  );

  // OTs pendientes
  const otsPromise = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("ordenes_trabajo_inter_co")
      .select("id", { count: "exact", head: true })
      .eq("estado", "solicitada")
      .in("empresa_destino_id", empresasIds)
  );

  // Solicitudes de proyecto pendientes de atender — la tabla es
  // `proyecto_solicitudes` (no `solicitudes`). Cuenta las que estan en
  // estado solicitada o en_revision, en las empresas que el user puede ver.
  const solicPromise = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await (supabase as any)
        .from("proyecto_solicitudes")
        .select("id", { count: "exact", head: true })
        .in("estado", ["solicitada", "en_revision"])
        .in("empresa_id", empresasIds);
      return r as { count: number | null };
    } catch {
      return { count: null };
    }
  })();

  const [ocs, ots, solic] = await Promise.all([
    ocsPromise,
    otsPromise,
    solicPromise,
  ]);

  const ocCount = (ocs as { count: number | null }).count ?? 0;
  const otCount = (ots as { count: number | null }).count ?? 0;
  const solicCount = (solic as { count: number | null }).count ?? 0;
  const total = ocCount + otCount + solicCount;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <ClipboardCheck className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Esperando mi aprobación
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum">
          {total}
        </span>
        <span className="text-[12px] font-medium text-ink-3">items</span>
      </div>
      <ul className="mt-3 space-y-1 border-t border-border pt-2 text-[11px]">
        <li>
          <Link
            href="/oc?estado=pendiente_aprobacion"
            className="flex items-center justify-between rounded px-1.5 py-1 hover:bg-bg-2"
          >
            <span>OCs</span>
            <span className="font-mono font-semibold tnum">{ocCount}</span>
          </Link>
        </li>
        <li>
          <Link
            href="/ot?estado=solicitada"
            className="flex items-center justify-between rounded px-1.5 py-1 hover:bg-bg-2"
          >
            <span>OTs inter-co</span>
            <span className="font-mono font-semibold tnum">{otCount}</span>
          </Link>
        </li>
        <li>
          <Link
            href="/solicitudes"
            className="flex items-center justify-between rounded px-1.5 py-1 hover:bg-bg-2"
          >
            <span>Solicitudes</span>
            <span className="font-mono font-semibold tnum">{solicCount}</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
