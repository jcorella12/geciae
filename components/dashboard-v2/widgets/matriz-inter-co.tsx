import { GitBranch } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

type Row = {
  empresa_origen_id: string | null;
  empresa_destino_id: string | null;
  total: number | null;
};

type Empresa = { id: string; codigo: string };

export async function MatrizInterCo() {
  const supabase = createClient();

  const [otsResp, empResp] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("ordenes_trabajo_inter_co")
      .select("empresa_origen_id, empresa_destino_id, total")
      .in("estado", ["aprobada", "completada_origen", "confirmada_destino", "facturada", "cobrada"]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("empresas")
      .select("id, codigo"),
  ]);

  const ots: Row[] = (otsResp as { data: Row[] | null }).data ?? [];
  const empresas: Empresa[] = (empResp as { data: Empresa[] | null }).data ?? [];
  const codigoMap = new Map(empresas.map((e) => [e.id, e.codigo]));

  // Sumar por par (origen, destino)
  const matriz = new Map<string, number>();
  for (const o of ots) {
    if (!o.empresa_origen_id || !o.empresa_destino_id) continue;
    const k = `${o.empresa_origen_id}|${o.empresa_destino_id}`;
    matriz.set(k, (matriz.get(k) ?? 0) + Number(o.total ?? 0));
  }

  return (
    <Link href="/finanzas/tesoreria/matriz" className="block">
      <div className="flex items-center gap-1.5">
        <GitBranch className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Matriz inter-co
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-[11px]">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left font-medium text-ink-3">Origen → Destino</th>
              {empresas.map((e) => (
                <th key={e.id} className="px-2 py-1 text-right font-medium text-ink-3">
                  {e.codigo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empresas.map((origen) => (
              <tr key={origen.id}>
                <td className="px-2 py-1 font-medium">{origen.codigo}</td>
                {empresas.map((destino) => {
                  if (origen.id === destino.id) {
                    return (
                      <td key={destino.id} className="px-2 py-1 text-right text-ink-3">
                        —
                      </td>
                    );
                  }
                  const monto = matriz.get(`${origen.id}|${destino.id}`) ?? 0;
                  return (
                    <td key={destino.id} className="px-2 py-1 text-right font-mono tnum">
                      {monto > 0 ? fmtMxnCompact.format(monto) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10.5px] text-ink-3">
        {ots.length} OT inter-co aprobadas en total · {codigoMap.size} empresas
      </p>
    </Link>
  );
}
