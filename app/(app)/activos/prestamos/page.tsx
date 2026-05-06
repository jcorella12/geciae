import { Plus } from "lucide-react";
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

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const ESTADO_COLOR: Record<string, string> = {
  solicitado: "bg-amber-100 text-amber-800",
  aprobado: "bg-blue-100 text-blue-800",
  rechazado: "bg-red-100 text-red-800",
  recogido: "bg-violet-100 text-violet-800",
  devuelto: "bg-emerald-100 text-emerald-800",
  facturado: "bg-emerald-200 text-emerald-900",
  cancelado: "bg-gray-100 text-gray-700",
};

const ESTADO_LABEL: Record<string, string> = {
  solicitado: "Solicitado",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  recogido: "Recogido",
  devuelto: "Devuelto",
  facturado: "Facturado",
  cancelado: "Cancelado",
};

export default async function PrestamosActivosPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const supabase = createClient();
  await obtenerVinculos();

  const { data: prestamos } = (await supabase
    .from("v_prestamos_activos_enriquecido" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)) as unknown as {
    data: Array<{
      id: string;
      numero: string;
      activo_codigo: string;
      activo_nombre: string;
      empresa_solicitante_codigo: string;
      empresa_propietaria_codigo: string;
      estado: string;
      fecha_recogida_prevista: string;
      fecha_devolucion_prevista: string;
      costo_total: number | null;
      dias_retraso: number | null;
    }> | null;
  };

  const lista = prestamos ?? [];
  const enUso = lista.filter((p) => p.estado === "recogido").length;
  const pendientes = lista.filter((p) => p.estado === "solicitado").length;
  const totalCostoMes = lista
    .filter((p) => ["devuelto", "facturado"].includes(p.estado))
    .reduce((acc, p) => acc + Number(p.costo_total ?? 0), 0);
  const retrasos = lista.filter((p) => (p.dias_retraso ?? 0) > 0).length;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Activos · Préstamos inter-empresa</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Préstamos de activos
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Solicitud, aprobación y devolución de activos compartidos del grupo. Costo se cobra al cierre del mes.
          </p>
        </div>
        <Link href="/activos/prestamos/nuevo">
          <Button>
            <Plus className="h-4 w-4" />
            Nueva solicitud
          </Button>
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="En uso" value={enUso} sub="actualmente prestados" />
        <KpiCard label="Pendientes" value={pendientes} sub="esperando aprobación" accent={pendientes > 0 ? "warn" : "ok"} />
        <KpiCard label="Con retraso" value={retrasos} accent={retrasos > 0 ? "danger" : "ok"} />
        <KpiCard label="Costo período" value={fmtMxn.format(totalCostoMes)} sub="devueltos + facturados" />
      </div>

      {lista.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Aún no hay préstamos. <Link href="/activos/prestamos/nuevo" className="text-brand hover:underline">Crear el primero →</Link>
        </p>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Número</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>De → A</TableHead>
                <TableHead>Recogida prev.</TableHead>
                <TableHead>Devolución prev.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead align="right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p) => (
                <TableRow
                  key={p.id}
                  href={`/activos/prestamos/${p.id}`}
                  linkLabel={`Abrir ${p.numero}`}
                >
                  <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                  <TableCell>
                    <p className="text-[12.5px] font-medium leading-tight">{p.activo_nombre}</p>
                    <p className="font-mono text-[10.5px] text-ink-3">{p.activo_codigo}</p>
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.empresa_propietaria_codigo} → {p.empresa_solicitante_codigo}
                  </TableCell>
                  <TableCell className="text-xs text-ink-3">
                    {new Date(p.fecha_recogida_prevista).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </TableCell>
                  <TableCell className="text-xs text-ink-3">
                    {new Date(p.fecha_devolucion_prevista).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    {(p.dias_retraso ?? 0) > 0 && (
                      <span className="ml-1 text-red-700 font-medium">+{p.dias_retraso}d</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${ESTADO_COLOR[p.estado] ?? ""}`}>
                      {ESTADO_LABEL[p.estado] ?? p.estado}
                    </span>
                  </TableCell>
                  <TableCell align="right" mono className="text-xs">
                    {p.costo_total != null && Number(p.costo_total) > 0
                      ? fmtMxn.format(Number(p.costo_total))
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </div>
  );
}
