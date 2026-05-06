import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { CerrarMesBtn } from "./cerrar-mes-btn";
import { DevengarBtn } from "./devengar-btn";

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

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

export default async function MatrizMensualPage({
  searchParams,
}: {
  searchParams?: { mes?: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const verConsolidada =
    esCEO(v) || tieneAtributo(v, "tesorero_corporativo");

  if (!verConsolidada) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-12 text-center">
        <h1 className="text-xl font-semibold">Sin acceso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La matriz inter-co consolidada solo es visible para el CEO o
          tesorero corporativo del grupo.
        </p>
      </div>
    );
  }

  // Mes seleccionado: por defecto el actual
  const hoy = new Date();
  const mesParam =
    searchParams?.mes ??
    `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = mesParam.split("-").map(Number);
  const desde = `${year}-${String(month).padStart(2, "0")}-01`;
  const hastaDate = new Date(year, month, 1); // primer día siguiente mes
  const hasta = hastaDate.toISOString().slice(0, 10);

  // Mes anterior y siguiente para navegación
  const prevMonthDate = new Date(year, month - 2, 1);
  const nextMonthDate = new Date(year, month, 1);
  const prevMes = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const nextMes = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const [
    { data: empresas },
    { data: prestamosVivos },
    { data: interesesMes },
    { data: otsMes },
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("prestamos_inter_co")
      .select(
        "id, empresa_acreedora_id, empresa_deudora_id, monto, monto_pagado, saldo_pendiente, estado, fecha_solicitud",
      )
      .in("estado", ["ejecutado", "confirmado", "pagado_parcial"]),
    supabase
      .from("prestamos_intereses")
      .select("prestamo_id, fecha, intereses_dia")
      .gte("fecha", desde)
      .lt("fecha", hasta),
    supabase
      .from("ordenes_trabajo_inter_co")
      .select(
        "id, empresa_origen_id, empresa_destino_id, total, estado, fecha_solicitud",
      )
      .in("estado", [
        "confirmada_destino",
        "en_proceso",
        "completada_origen",
        "lista_cobrar",
        "facturada",
      ])
      .gte("fecha_solicitud", desde)
      .lt("fecha_solicitud", hasta),
  ]);

  const empresasList: Empresa[] = empresas ?? [];

  // Mapear préstamoId → suma de intereses del mes
  const interesesPrestamoMap = new Map<string, number>();
  for (const i of interesesMes ?? []) {
    interesesPrestamoMap.set(
      i.prestamo_id,
      (interesesPrestamoMap.get(i.prestamo_id) ?? 0) +
        Number(i.intereses_dia ?? 0),
    );
  }

  // Matriz: clave "acreedora|deudora" → { saldo, intereses, ot }
  type Cell = { saldoPrestamos: number; intereses: number; ot: number };
  const matriz = new Map<string, Cell>();
  function add(
    acrId: string,
    deuId: string,
    campo: keyof Cell,
    valor: number,
  ) {
    const k = `${acrId}|${deuId}`;
    const c = matriz.get(k) ?? { saldoPrestamos: 0, intereses: 0, ot: 0 };
    c[campo] += valor;
    matriz.set(k, c);
  }

  for (const p of prestamosVivos ?? []) {
    const saldo = Number(
      p.saldo_pendiente ?? Number(p.monto) - Number(p.monto_pagado ?? 0),
    );
    add(p.empresa_acreedora_id, p.empresa_deudora_id, "saldoPrestamos", saldo);
    const intereses = interesesPrestamoMap.get(p.id) ?? 0;
    if (intereses > 0) {
      add(p.empresa_acreedora_id, p.empresa_deudora_id, "intereses", intereses);
    }
  }
  for (const o of otsMes ?? []) {
    // OT inter-co: empresa_destino presta el servicio (acreedora), empresa_origen paga (deudora)
    add(
      o.empresa_destino_id,
      o.empresa_origen_id,
      "ot",
      Number(o.total ?? 0),
    );
  }

  const labelMes = new Date(year, month - 1, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  // Totales por fila/columna
  const totalRow = new Map<string, number>();
  const totalCol = new Map<string, number>();
  let granTotal = 0;
  for (const acr of empresasList) {
    for (const deu of empresasList) {
      if (acr.id === deu.id) continue;
      const c = matriz.get(`${acr.id}|${deu.id}`) ?? {
        saldoPrestamos: 0,
        intereses: 0,
        ot: 0,
      };
      const v = c.saldoPrestamos + c.intereses + c.ot;
      totalRow.set(acr.id, (totalRow.get(acr.id) ?? 0) + v);
      totalCol.set(deu.id, (totalCol.get(deu.id) ?? 0) + v);
      granTotal += v;
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <Link
            href="/finanzas/tesoreria"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Tesorería
          </Link>
          <h1 className="mt-2 text-2xl font-semibold leading-tight capitalize">
            Matriz inter-co · {labelMes}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldo de préstamos vivos + intereses devengados del mes + OT del
            mes. Filas = empresa acreedora, columnas = empresa deudora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/finanzas/tesoreria/matriz?mes=${prevMes}`}>
            <Button variant="outline" size="sm">
              ← {prevMes}
            </Button>
          </Link>
          <Link href={`/finanzas/tesoreria/matriz?mes=${nextMes}`}>
            <Button variant="outline" size="sm">
              {nextMes} →
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <DevengarBtn />
        <CerrarMesBtn anio={year} mes={month} />
        <p className="text-xs text-muted-foreground">
          Cron automático corre cada noche a las 23:55 (MX). Botones para
          forzar manualmente o cerrar el mes con snapshot por par de empresas.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50 text-left">
            <tr>
              <th className="sticky left-0 z-10 bg-secondary/80 px-4 py-2 font-medium">
                Acreedora ↓ / Deudora →
              </th>
              {empresasList.map((deu) => (
                <th
                  key={deu.id}
                  className="px-3 py-2 text-right font-medium"
                  style={{ minWidth: 130 }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        empresaCodigoColor[deu.codigo] ?? "bg-muted-foreground"
                      }`}
                    />
                    {deu.codigo}
                  </span>
                </th>
              ))}
              <th className="bg-secondary/80 px-4 py-2 text-right font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {empresasList.map((acr) => (
              <tr key={acr.id}>
                <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        empresaCodigoColor[acr.codigo] ?? "bg-muted-foreground"
                      }`}
                    />
                    {acr.codigo}
                  </span>
                </td>
                {empresasList.map((deu) => {
                  if (acr.id === deu.id) {
                    return (
                      <td
                        key={deu.id}
                        className="px-3 py-3 text-right text-xs text-muted-foreground"
                      >
                        —
                      </td>
                    );
                  }
                  const c = matriz.get(`${acr.id}|${deu.id}`) ?? {
                    saldoPrestamos: 0,
                    intereses: 0,
                    ot: 0,
                  };
                  const total = c.saldoPrestamos + c.intereses + c.ot;
                  if (total === 0) {
                    return (
                      <td
                        key={deu.id}
                        className="px-3 py-3 text-right text-xs text-muted-foreground"
                      >
                        —
                      </td>
                    );
                  }
                  return (
                    <td
                      key={deu.id}
                      className="px-3 py-3 text-right"
                      title={`Préstamos: ${fmtMxnFull.format(c.saldoPrestamos)}\nIntereses mes: ${fmtMxnFull.format(c.intereses)}\nOT mes: ${fmtMxnFull.format(c.ot)}`}
                    >
                      <p className="font-mono text-sm font-medium">
                        {fmtMxn.format(total)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {c.saldoPrestamos > 0 && (
                          <span>P {fmtMxn.format(c.saldoPrestamos)}</span>
                        )}
                        {c.intereses > 0 && (
                          <span className="ml-1">
                            I {fmtMxn.format(c.intereses)}
                          </span>
                        )}
                        {c.ot > 0 && (
                          <span className="ml-1">OT {fmtMxn.format(c.ot)}</span>
                        )}
                      </p>
                    </td>
                  );
                })}
                <td className="bg-secondary/30 px-4 py-3 text-right font-mono font-semibold">
                  {fmtMxn.format(totalRow.get(acr.id) ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border bg-secondary/30">
            <tr>
              <td className="sticky left-0 z-10 bg-secondary/80 px-4 py-3 font-semibold">
                Total
              </td>
              {empresasList.map((deu) => (
                <td
                  key={deu.id}
                  className="px-3 py-3 text-right font-mono font-semibold"
                >
                  {fmtMxn.format(totalCol.get(deu.id) ?? 0)}
                </td>
              ))}
              <td className="bg-primary/10 px-4 py-3 text-right font-mono font-bold">
                {fmtMxn.format(granTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        <p>
          <strong>P</strong> = saldo de préstamos vivos · <strong>I</strong> =
          intereses devengados del mes · <strong>OT</strong> = OT inter-co
          solicitadas en el mes.
        </p>
      </div>
    </div>
  );
}
