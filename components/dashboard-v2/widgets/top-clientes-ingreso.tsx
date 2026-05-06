import { Briefcase } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

type CfdiRow = {
  cliente_id: string | null;
  total: number | null;
};

type ClienteRow = {
  id: string;
  razon_social: string;
};

export async function TopClientesIngreso() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = Array.from(new Set(v.map((x) => x.empresa_id)));

  const desde = new Date();
  desde.setMonth(desde.getMonth() - 12);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cfdis } = (await (supabase as any)
    .from("cfdi")
    .select("cliente_id, total")
    .eq("tipo", "ingreso")
    .eq("es_emitido", true)
    .in("estado", ["timbrado", "enviado_cliente", "pagado"])
    .in("empresa_id", empresasFiltro)
    .gte("fecha", desde.toISOString().slice(0, 10))) as unknown as {
    data: CfdiRow[] | null;
  };

  // Agrupar por cliente_id
  const map = new Map<string, number>();
  for (const c of cfdis ?? []) {
    if (!c.cliente_id) continue;
    map.set(c.cliente_id, (map.get(c.cliente_id) ?? 0) + Number(c.total ?? 0));
  }

  const topIds = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const ids = topIds.map(([id]) => id);
  const clientes: Record<string, string> = {};
  if (ids.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: list } = (await (supabase as any)
      .from("clientes")
      .select("id, razon_social")
      .in("id", ids)) as unknown as { data: ClienteRow[] | null };
    for (const c of list ?? []) clientes[c.id] = c.razon_social;
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Briefcase className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Top clientes (12m)
        </span>
      </div>
      {topIds.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-ink-3">Sin facturación reciente.</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {topIds.map(([id, total], i) => (
            <li key={id}>
              <Link
                href={`/clientes/${id}`}
                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-bg-2"
              >
                <span className="font-mono text-[10.5px] text-ink-3 tnum">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">
                  {clientes[id] ?? "—"}
                </span>
                <span className="font-mono text-[11px] font-semibold tnum">
                  {fmtMxnCompact.format(total)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
