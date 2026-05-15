import { Banknote } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

export async function TesoreriaResumen() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = Array.from(new Set(v.map((x) => x.empresa_id)));

  // Inicio del mes en ISO para sumar intereses devengados del mes en curso.
  const ahora = new Date();
  const inicioMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-01`;

  const [cuentas, prestamos, intereses] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("bancos_cuentas")
      .select("saldo_actual, tipo, linea_credito_dispuesto")
      .eq("activa", true)
      .in("empresa_id", empresasFiltro),
    // Inter-co: el "deudor" es quien debe el dinero.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("prestamos_inter_co")
      .select("saldo_pendiente, empresa_deudora_id")
      .in("estado", ["ejecutado", "confirmado", "pagado_parcial"])
      .in("empresa_deudora_id", empresasFiltro),
    // Intereses devengados del mes en curso (suma diaria desde inicio de mes).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("prestamos_intereses")
      .select("intereses_dia, prestamos_inter_co!inner(empresa_deudora_id)")
      .gte("fecha", inicioMes)
      .in(
        "prestamos_inter_co.empresa_deudora_id",
        empresasFiltro,
      )
      .then(
        (r: unknown) => r,
        () => ({ data: [] }),
      ),
  ]);

  type CuentaRow = {
    saldo_actual: number | null;
    tipo: string | null;
    linea_credito_dispuesto: number | null;
  };
  const cuentasData = (cuentas as { data: CuentaRow[] | null }).data ?? [];
  // Cash = solo cuentas no-crédito; el crédito dispuesto se suma a deuda.
  const cash = cuentasData
    .filter((c) => c.tipo !== "credito")
    .reduce((acc, c) => acc + Number(c.saldo_actual ?? 0), 0);
  const deudaBancaria = cuentasData
    .filter((c) => c.tipo === "credito")
    .reduce((acc, c) => acc + Number(c.linea_credito_dispuesto ?? 0), 0);

  const deudaInterCo = (
    (prestamos as { data: { saldo_pendiente: number | null }[] | null }).data ??
    []
  ).reduce((acc, p) => acc + Number(p.saldo_pendiente ?? 0), 0);
  const deuda = deudaBancaria + deudaInterCo;

  const interesesData = (
    intereses as { data: { intereses_dia: number | null }[] | null }
  ).data ?? [];
  const interesesMes = interesesData.reduce(
    (acc, i) => acc + Number(i.intereses_dia ?? 0),
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
            {fmtMxnCompact.format(interesesMes)}
          </div>
        </div>
      </div>
    </Link>
  );
}
