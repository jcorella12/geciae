/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import { obtenerVinculos } from "@/lib/auth/permisos";
import type { PnLResumen } from "@/lib/proyecto-pnl/state";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export default async function ReportesProyectosPnlPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  const { data } = (await (supabase as any)
    .from("v_proyecto_pnl_resumen")
    .select("*")
    .in("empresa_id", empresasIds)
    .order("ingreso_presupuestado", { ascending: false, nullsFirst: false })
    .limit(200)) as unknown as { data: PnLResumen[] | null };

  const lista = (data ?? []).filter(
    (p) => Number(p.ingreso_presupuestado ?? 0) > 0,
  );

  const totalIngresos = lista.reduce(
    (acc, p) => acc + Number(p.ingreso_presupuestado ?? 0),
    0,
  );
  const totalMargenN = lista.reduce(
    (acc, p) => acc + Number(p.margen_neto ?? 0),
    0,
  );
  const totalCostosT = lista.reduce(
    (acc, p) => acc + Number(p.costos_totales ?? 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6">
        <p className="lbl-mini">Reportes</p>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight">
          Rentabilidad por proyecto
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          {lista.length} proyectos con presupuesto · ingresos $
          {fmtMxn.format(totalIngresos)} · margen neto agregado $
          {fmtMxn.format(totalMargenN)} ({totalIngresos > 0 ? ((totalMargenN / totalIngresos) * 100).toFixed(1) : 0}%)
        </p>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Aún no hay proyectos con presupuesto capturado. Captura el presupuesto
          desde la pestaña Rentabilidad de cada proyecto.
        </p>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Código</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead align="right">Ingreso</TableHead>
                <TableHead align="right">Costos</TableHead>
                <TableHead align="right">Margen neto</TableHead>
                <TableHead align="right">% margen</TableHead>
                <TableHead align="right">% obj</TableHead>
                <TableHead>Salud</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p) => {
                const ing = Number(p.ingreso_presupuestado ?? 0);
                const margen = Number(p.margen_neto ?? 0);
                const pct = ing > 0 ? (margen / ing) * 100 : 0;
                const obj = Number(p.margen_objetivo_pct ?? 0);
                const salud =
                  obj > 0 && pct >= obj
                    ? "ok"
                    : pct >= obj * 0.8
                      ? "warn"
                      : "danger";
                return (
                  <TableRow
                    key={p.proyecto_id}
                    href={`/proyectos/${p.proyecto_id}/pnl`}
                    linkLabel={p.codigo}
                  >
                    <TableCell className="font-mono text-xs">
                      {p.codigo}
                    </TableCell>
                    <TableCell className="text-[12.5px]">{p.nombre}</TableCell>
                    <TableCell align="right" mono className="text-xs">
                      {fmtMxn.format(ing)}
                    </TableCell>
                    <TableCell align="right" mono className="text-xs">
                      {fmtMxn.format(Number(p.costos_totales ?? 0))}
                    </TableCell>
                    <TableCell align="right" mono className="text-xs">
                      <span
                        className={
                          margen >= 0 ? "text-emerald-700" : "text-red-700"
                        }
                      >
                        {fmtMxn.format(margen)}
                      </span>
                    </TableCell>
                    <TableCell align="right" mono className="text-xs">
                      {pct.toFixed(1)}%
                    </TableCell>
                    <TableCell align="right" mono className="text-xs text-ink-3">
                      {obj > 0 ? `${obj}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                          salud === "ok"
                            ? "bg-emerald-100 text-emerald-800"
                            : salud === "warn"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {salud === "ok"
                          ? "✓ OK"
                          : salud === "warn"
                            ? "⚠ Cerca"
                            : "🔴 Bajo"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableSurface>
      )}

      <p className="mt-6 text-[11.5px] text-ink-3">
        <Link href="/reportes" className="text-brand hover:underline">
          ← Otros reportes
        </Link>
      </p>
    </div>
  );
}
