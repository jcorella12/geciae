import { ReceiptText } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

type CfdiRow = {
  proveedor_id: string | null;
  total: number | null;
};

export async function TopProveedoresPago() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cfdis } = (await (supabase as any)
    .from("cfdi")
    .select("proveedor_id, total")
    .eq("tipo", "egreso")
    .eq("es_emitido", false)
    .in("estado", ["timbrado", "enviado_cliente"])
    .in("empresa_id", empresasFiltro)) as unknown as { data: CfdiRow[] | null };

  const map = new Map<string, number>();
  for (const c of cfdis ?? []) {
    if (!c.proveedor_id) continue;
    map.set(c.proveedor_id, (map.get(c.proveedor_id) ?? 0) + Number(c.total ?? 0));
  }

  const top = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const ids = top.map(([id]) => id);
  const proveedores: Record<string, string> = {};
  if (ids.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: list } = (await (supabase as any)
      .from("proveedores")
      .select("id, razon_social")
      .in("id", ids)) as unknown as { data: { id: string; razon_social: string }[] | null };
    for (const p of list ?? []) proveedores[p.id] = p.razon_social;
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <ReceiptText className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Top proveedores por pagar
        </span>
      </div>
      {top.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-ink-3">Sin saldos pendientes.</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {top.map(([id, total], i) => (
            <li key={id}>
              <Link
                href={`/finanzas/proveedores/${id}`}
                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-bg-2"
              >
                <span className="font-mono text-[10.5px] text-ink-3 tnum">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">
                  {proveedores[id] ?? "—"}
                </span>
                <span className="font-mono text-[11px] font-semibold text-warn-deep tnum">
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
