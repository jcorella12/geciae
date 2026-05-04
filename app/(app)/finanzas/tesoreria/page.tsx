import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Landmark,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const fmtMxnFull = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export default async function TesoreriaConsolidadaPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const verConsolidada =
    esCEO(v) || tieneAtributo(v, "tesorero_corporativo");

  const empresasUser = v.map((vi) => vi.empresa_id);

  const [
    { data: empresas },
    { data: saldosBancos },
    { data: ocPagar },
    { data: otCobrar },
    { data: prestamosVivos },
    { data: tiieReciente },
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .eq("activa", true)
      .order("codigo"),
    supabase.from("v_saldo_bancos_por_empresa").select("*"),
    supabase
      .from("ordenes_compra")
      .select("id, empresa_id, total, estado, fecha_emision")
      .in("estado", ["aprobada", "enviada", "parcial_recibida", "recibida"]),
    supabase
      .from("ordenes_trabajo_inter_co")
      .select("id, empresa_origen_id, empresa_destino_id, total, estado")
      .in("estado", [
        "confirmada_destino",
        "en_proceso",
        "completada_origen",
        "lista_cobrar",
        "facturada",
      ]),
    supabase
      .from("prestamos_inter_co")
      .select(
        "id, empresa_acreedora_id, empresa_deudora_id, monto, monto_pagado, saldo_pendiente, estado",
      )
      .in("estado", ["ejecutado", "confirmado", "pagado_parcial"]),
    supabase
      .from("tiie_historico")
      .select("fecha, tasa")
      .eq("tipo", "tiie_28")
      .order("fecha", { ascending: false })
      .limit(1),
  ]);

  // Filtrar por empresas del usuario si no es CEO/tesorero
  const empresasVisibles = verConsolidada
    ? (empresas ?? []).map((e) => e.id)
    : empresasUser;

  const empresasFiltradas = (empresas ?? []).filter((e) =>
    empresasVisibles.includes(e.id),
  );

  // Indexar por empresa
  const saldoMap = new Map<string, number>();
  for (const s of saldosBancos ?? []) {
    if (s.empresa_id) saldoMap.set(s.empresa_id, Number(s.saldo_total ?? 0));
  }
  const ocMap = new Map<string, number>();
  for (const o of ocPagar ?? []) {
    ocMap.set(o.empresa_id, (ocMap.get(o.empresa_id) ?? 0) + Number(o.total));
  }
  const otCobrarMap = new Map<string, number>();
  for (const o of otCobrar ?? []) {
    otCobrarMap.set(
      o.empresa_destino_id,
      (otCobrarMap.get(o.empresa_destino_id) ?? 0) + Number(o.total ?? 0),
    );
  }
  const prestPorCobrarMap = new Map<string, number>();
  const prestPorPagarMap = new Map<string, number>();
  for (const p of prestamosVivos ?? []) {
    const saldo = Number(p.saldo_pendiente ?? Number(p.monto) - Number(p.monto_pagado ?? 0));
    prestPorCobrarMap.set(
      p.empresa_acreedora_id,
      (prestPorCobrarMap.get(p.empresa_acreedora_id) ?? 0) + saldo,
    );
    prestPorPagarMap.set(
      p.empresa_deudora_id,
      (prestPorPagarMap.get(p.empresa_deudora_id) ?? 0) + saldo,
    );
  }

  // KPIs consolidados (solo de empresas visibles)
  let totalBancos = 0;
  let totalOcPagar = 0;
  let totalOtCobrar = 0;
  let totalPrestPorCobrar = 0;
  let totalPrestPorPagar = 0;
  for (const e of empresasFiltradas) {
    totalBancos += saldoMap.get(e.id) ?? 0;
    totalOcPagar += ocMap.get(e.id) ?? 0;
    totalOtCobrar += otCobrarMap.get(e.id) ?? 0;
    totalPrestPorCobrar += prestPorCobrarMap.get(e.id) ?? 0;
    totalPrestPorPagar += prestPorPagarMap.get(e.id) ?? 0;
  }
  const liquidezNeta = totalBancos - totalOcPagar + totalOtCobrar;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">Tesorería</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {verConsolidada
              ? "Posición consolidada del grupo (todas las empresas)."
              : "Tu posición en las empresas a las que perteneces."}
          </p>
        </div>
        {tiieReciente?.[0] && (
          <div className="text-right text-xs text-muted-foreground">
            <p>TIIE 28 hoy</p>
            <p className="font-mono text-base font-semibold text-foreground">
              {(Number(tiieReciente[0].tasa) * 100).toFixed(4)}%
            </p>
            <p className="mt-0.5">
              {new Date(tiieReciente[0].fecha).toLocaleDateString("es-MX")}
            </p>
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Banknote className="h-4 w-4" />}
          label="Saldo bancos"
          valor={fmtMxn.format(totalBancos)}
          color="emerald"
        />
        <Kpi
          icon={<CreditCard className="h-4 w-4" />}
          label="OC por pagar"
          valor={fmtMxn.format(totalOcPagar)}
          color="amber"
        />
        <Kpi
          icon={<ArrowLeftRight className="h-4 w-4" />}
          label="OT por cobrar (inter-co)"
          valor={fmtMxn.format(totalOtCobrar)}
          color="cyan"
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Liquidez neta"
          valor={fmtMxn.format(liquidezNeta)}
          color={liquidezNeta >= 0 ? "blue" : "red"}
        />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Link
          href="/finanzas/tesoreria/cuentas"
          className="group rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary"
        >
          <Landmark className="h-5 w-5 text-primary" />
          <p className="mt-2 font-medium">Cuentas bancarias</p>
          <p className="text-xs text-muted-foreground">
            Saldos y altas/bajas de cuentas.
          </p>
        </Link>
        <Link
          href="/finanzas/tesoreria/creditos"
          className="group rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary"
        >
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <p className="mt-2 font-medium">Líneas inter-co</p>
          <p className="text-xs text-muted-foreground">
            Marcos de crédito entre empresas del grupo.
          </p>
        </Link>
        <Link
          href="/finanzas/tesoreria/prestamos"
          className="group rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary"
        >
          <CreditCard className="h-5 w-5 text-primary" />
          <p className="mt-2 font-medium">Préstamos</p>
          <p className="text-xs text-muted-foreground">
            Solicitudes, aprobación, pagos e intereses.
          </p>
        </Link>
        <Link
          href="/finanzas/tesoreria/matriz"
          className="group rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary"
        >
          <TrendingUp className="h-5 w-5 text-primary" />
          <p className="mt-2 font-medium">Matriz mensual</p>
          <p className="text-xs text-muted-foreground">
            Exposición cruzada acreedora/deudora.
          </p>
        </Link>
        <Link
          href="/finanzas/tesoreria/tiie"
          className="group rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary"
        >
          <Banknote className="h-5 w-5 text-primary" />
          <p className="mt-2 font-medium">TIIE 28</p>
          <p className="text-xs text-muted-foreground">
            Histórico y sincronización Banxico.
          </p>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Posición por empresa</h2>
        </div>
        {empresasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Sin empresas visibles.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Empresa</th>
                  <th className="px-4 py-2 text-right font-medium">Bancos</th>
                  <th className="px-4 py-2 text-right font-medium">OC pagar</th>
                  <th className="px-4 py-2 text-right font-medium">
                    OT cobrar
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    Préstamos cobrar
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    Préstamos pagar
                  </th>
                  <th className="px-4 py-2 text-right font-medium">Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {empresasFiltradas.map((e) => {
                  const bancos = saldoMap.get(e.id) ?? 0;
                  const oc = ocMap.get(e.id) ?? 0;
                  const ot = otCobrarMap.get(e.id) ?? 0;
                  const pCobrar = prestPorCobrarMap.get(e.id) ?? 0;
                  const pPagar = prestPorPagarMap.get(e.id) ?? 0;
                  const neto = bancos - oc + ot + pCobrar - pPagar;
                  return (
                    <tr key={e.id}>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-sm font-medium">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              empresaCodigoColor[e.codigo] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          {e.codigo}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {e.nombre_comercial ?? e.razon_social}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {fmtMxnFull.format(bancos)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-700">
                        {oc > 0 ? `−${fmtMxnFull.format(oc)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-cyan-700">
                        {ot > 0 ? fmtMxnFull.format(ot) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        {pCobrar > 0 ? fmtMxnFull.format(pCobrar) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-700">
                        {pPagar > 0 ? `−${fmtMxnFull.format(pPagar)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {fmtMxnFull.format(neto)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {empresasFiltradas.length > 1 && (
                <tfoot className="border-t-2 border-border bg-secondary/30">
                  <tr>
                    <td className="px-4 py-3 font-medium">
                      Total {verConsolidada ? "grupo" : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {fmtMxnFull.format(totalBancos)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {totalOcPagar > 0
                        ? `−${fmtMxnFull.format(totalOcPagar)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {totalOtCobrar > 0 ? fmtMxnFull.format(totalOtCobrar) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {fmtMxnFull.format(totalPrestPorCobrar)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {totalPrestPorPagar > 0
                        ? `−${fmtMxnFull.format(totalPrestPorPagar)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {fmtMxnFull.format(
                        totalBancos -
                          totalOcPagar +
                          totalOtCobrar +
                          totalPrestPorCobrar -
                          totalPrestPorPagar,
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  valor,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  color: "emerald" | "amber" | "cyan" | "blue" | "red";
}) {
  const colorClass: Record<typeof color, string> = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${colorClass[color]}`}
        >
          {icon}
        </span>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 font-mono text-xl font-semibold">{valor}</p>
    </div>
  );
}
