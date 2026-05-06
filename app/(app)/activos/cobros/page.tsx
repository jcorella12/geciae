import Link from "next/link";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
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
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export default async function CobrosPage() {
  const supabase = createClient();
  await obtenerVinculos();

  const { data: pendientes } = (await supabase
    .from("v_prestamos_pendientes_facturar" as never)
    .select("*")) as unknown as {
    data: Array<{
      id: string;
      numero: string;
      activo_codigo: string;
      activo_nombre: string;
      empresa_solicitante_codigo: string;
      empresa_propietaria_codigo: string;
      costo_total: number;
      fecha_devolucion_real: string;
    }> | null;
  };

  const { data: consolidados } = (await supabase
    .from("cfdi_consolidado_activos" as never)
    .select("*")
    .order("fecha_generacion", { ascending: false })
    .limit(50)) as unknown as {
    data: Array<{
      id: string;
      numero: string;
      empresa_emisora_id: string;
      empresa_receptora_id: string;
      periodo_anio: number;
      periodo_mes: number;
      num_prestamos: number;
      total: number;
      estado: string;
    }> | null;
  };

  const totalPendiente = (pendientes ?? []).reduce(
    (acc, p) => acc + Number(p.costo_total ?? 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Activos · Cobro inter-co</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Cobros de activos
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Préstamos devueltos pendientes de facturar y CFDI consolidados mensuales por empresa.
          </p>
        </div>
        <Link href="/activos/cobros/cierre-mensual">
          <Button>Cierre mensual</Button>
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Pendientes facturar" value={(pendientes ?? []).length} />
        <KpiCard label="Total pendiente" value={fmtMxn.format(totalPendiente)} />
        <KpiCard label="Consolidados" value={(consolidados ?? []).length} sub="últimos 50" />
      </div>

      <h2 className="mb-3 text-base font-semibold">Pendientes de facturar</h2>
      {(pendientes ?? []).length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-ink-3">
          Sin préstamos pendientes.
        </p>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Número</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>De → A</TableHead>
                <TableHead>Devolución</TableHead>
                <TableHead align="right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pendientes ?? []).map((p) => (
                <TableRow
                  key={p.id}
                  href={`/activos/prestamos/${p.id}`}
                  linkLabel={p.numero}
                >
                  <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                  <TableCell className="text-xs">
                    <span className="font-medium">{p.activo_nombre}</span>
                    <span className="ml-1 font-mono text-ink-3">{p.activo_codigo}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.empresa_propietaria_codigo} → {p.empresa_solicitante_codigo}
                  </TableCell>
                  <TableCell className="text-xs text-ink-3">
                    {new Date(p.fecha_devolucion_real).toLocaleDateString("es-MX")}
                  </TableCell>
                  <TableCell align="right" mono className="text-xs">
                    {fmtMxn.format(Number(p.costo_total ?? 0))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableSurface>
      )}

      <h2 className="mb-3 mt-8 text-base font-semibold">CFDI consolidados</h2>
      {(consolidados ?? []).length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-ink-3">
          Aún no se han generado consolidados.
        </p>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Número</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead># Préstamos</TableHead>
                <TableHead align="right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(consolidados ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                  <TableCell className="text-xs">
                    {String(c.periodo_mes).padStart(2, "0")}/{c.periodo_anio}
                  </TableCell>
                  <TableCell className="text-xs">{c.num_prestamos}</TableCell>
                  <TableCell align="right" mono className="text-xs">
                    {fmtMxn.format(Number(c.total))}
                  </TableCell>
                  <TableCell className="text-xs capitalize">{c.estado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </div>
  );
}
