import { Wallet } from "lucide-react";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

type Tile = {
  label: string;
  value: number;
  href: string;
  accent?: "ok" | "warn" | "danger" | "brand";
};

export async function PosicionConsolidada() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = Array.from(new Set(v.map((x) => x.empresa_id)));

  const [cuentas, prestamos, cxc, cxp] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("bancos_cuentas")
      .select("saldo_actual")
      .eq("activa", true)
      .in("empresa_id", empresasFiltro),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("prestamos")
      .select("saldo_actual")
      .eq("estado", "activo")
      .in("empresa_id", empresasFiltro)
      .then(
        (r: { data: { saldo_actual: number }[] | null }) => r,
        () => ({ data: [] }),
      ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("cfdi")
      .select("total")
      .eq("tipo", "ingreso")
      .eq("es_emitido", true)
      .in("estado", ["timbrado", "enviado_cliente"])
      .in("empresa_id", empresasFiltro),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("cfdi")
      .select("total")
      .eq("tipo", "egreso")
      .eq("es_emitido", false)
      .in("estado", ["timbrado", "enviado_cliente"])
      .in("empresa_id", empresasFiltro),
  ]);

  const cash = ((cuentas as { data: { saldo_actual: number | null }[] | null }).data ?? []).reduce(
    (acc, c) => acc + Number(c.saldo_actual ?? 0),
    0,
  );
  const credito = ((prestamos as { data: { saldo_actual: number }[] | null }).data ?? []).reduce(
    (acc, p) => acc + Number(p.saldo_actual ?? 0),
    0,
  );
  const cxcTotal = ((cxc as { data: { total: number }[] | null }).data ?? []).reduce(
    (acc, c) => acc + Number(c.total ?? 0),
    0,
  );
  const cxpTotal = ((cxp as { data: { total: number }[] | null }).data ?? []).reduce(
    (acc, c) => acc + Number(c.total ?? 0),
    0,
  );
  const posicion = cash + cxcTotal - credito - cxpTotal;

  const tiles: Tile[] = [
    { label: "Cash", value: cash, href: "/finanzas/tesoreria/cuentas", accent: "ok" },
    { label: "Créditos", value: credito, href: "/finanzas/tesoreria/creditos", accent: "danger" },
    { label: "CxC", value: cxcTotal, href: "/finanzas/cfdi?tipo=ingreso", accent: "brand" },
    { label: "CxP", value: cxpTotal, href: "/finanzas/cfdi?tipo=egreso", accent: "warn" },
    { label: "Pos. neta", value: posicion, href: "/finanzas/tesoreria", accent: posicion >= 0 ? "ok" : "danger" },
  ];

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Wallet className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Posición consolidada del grupo
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-md border border-border bg-bg-2 px-3 py-2.5">
            <div className="text-[10.5px] font-medium uppercase tracking-wide text-ink-3">
              {t.label}
            </div>
            <div className="mt-1 font-mono text-[15px] font-semibold tnum">
              {fmtMxnCompact.format(t.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
