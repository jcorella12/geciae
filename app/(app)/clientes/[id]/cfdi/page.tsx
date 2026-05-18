import { FileText } from "lucide-react";
import Link from "next/link";

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
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const fmtFecha = (s: string | null) =>
  s
    ? new Date(s).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : "—";

const ESTADO_BADGE: Record<string, string> = {
  borrador: "bg-secondary text-ink-2",
  timbrado: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  enviado_cliente:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  pagado:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  timbrado: "Timbrado",
  enviado_cliente: "Enviado",
  pagado: "Pagado",
  cancelado: "Cancelado",
};

const TIPO_LABEL: Record<string, string> = {
  ingreso: "Ingreso",
  egreso: "Egreso (NC)",
  traslado: "Traslado",
  pago: "Pago",
  nomina: "Nómina",
};

export default async function ClienteCfdiPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // CFDI emitidos al cliente (es_emitido=true). Los recibidos no aplican.
  // `monto_pagado` se mantiene en la fila del CFDI; saldo = total - monto_pagado.
  const { data: cfdi } = await supabase
    .from("cfdi")
    .select(
      "id, tipo, serie, folio, fecha_emision, fecha_timbrado, total, monto_pagado, estado, metodo_pago, uuid_sat, empresa_id, empresas(codigo, nombre_comercial)",
    )
    .eq("cliente_id", params.id)
    .eq("es_emitido", true)
    .order("fecha_emision", { ascending: false, nullsFirst: false })
    .limit(200);

  const lista = (cfdi ?? []) as Array<{
    id: string;
    tipo: string;
    serie: string | null;
    folio: string | null;
    fecha_emision: string | null;
    fecha_timbrado: string | null;
    total: number;
    monto_pagado: number | null;
    estado: string;
    metodo_pago: string | null;
    uuid_sat: string | null;
    empresas: { codigo: string; nombre_comercial: string | null } | null;
  }>;

  // KPIs
  const activos = lista.filter((c) => c.estado !== "cancelado");
  const totalFacturado = activos.reduce((a, c) => a + Number(c.total ?? 0), 0);
  const totalCobrado = activos.reduce(
    (a, c) => a + Number(c.monto_pagado ?? 0),
    0,
  );
  const porCobrar = Math.max(0, totalFacturado - totalCobrado);
  const cancelados = lista.length - activos.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="CFDI emitidos"
          value={activos.length}
          sub={cancelados > 0 ? `+${cancelados} cancelados` : "vigentes"}
        />
        <KpiCard
          label="Total facturado"
          value={fmtMxn.format(totalFacturado)}
          sub="sin cancelados"
        />
        <KpiCard
          label="Cobrado"
          value={fmtMxn.format(totalCobrado)}
          accent="ok"
        />
        <KpiCard
          label="Por cobrar"
          value={fmtMxn.format(porCobrar)}
          accent={porCobrar > 0 ? "warn" : "ok"}
        />
      </div>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold">CFDI emitidos al cliente</h2>
          <p className="text-xs text-muted-foreground">
            Histórico de las últimas 200 facturas emitidas. Para CFDI recibidos
            (gastos) entra a /finanzas/cfdi.
          </p>
        </div>

        {lista.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Sin CFDI emitidos a este cliente todavía.
          </p>
        ) : (
          <TableSurface>
            <Table>
              <TableHeader>
                <TableRow interactive={false}>
                  <TableHead>Serie / Folio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead align="center">Fecha</TableHead>
                  <TableHead align="right">Total</TableHead>
                  <TableHead align="right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => {
                  const cobrado = Number(c.monto_pagado ?? 0);
                  const saldo = Number(c.total ?? 0) - cobrado;
                  const isCancelado = c.estado === "cancelado";
                  return (
                    <TableRow
                      key={c.id}
                      href={`/finanzas/cfdi/${c.id}`}
                      linkLabel={`Abrir CFDI ${c.serie ?? ""}-${c.folio ?? ""}`}
                    >
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-ink-3" />
                          {c.serie ?? "—"}
                          {c.folio && <>-{c.folio}</>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-ink-2">
                        {TIPO_LABEL[c.tipo] ?? c.tipo}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.empresas?.nombre_comercial ??
                          c.empresas?.codigo ??
                          "—"}
                      </TableCell>
                      <TableCell align="center" className="text-xs">
                        {fmtFecha(c.fecha_emision)}
                      </TableCell>
                      <TableCell align="right" mono className="text-xs">
                        {fmtMxn.format(Number(c.total ?? 0))}
                      </TableCell>
                      <TableCell align="right" mono className="text-xs">
                        {isCancelado ? (
                          <span className="text-ink-3">—</span>
                        ) : saldo < 0.5 ? (
                          <span className="text-emerald-700">$0</span>
                        ) : (
                          <span className="text-amber-700">
                            {fmtMxn.format(saldo)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                            ESTADO_BADGE[c.estado] ?? "bg-secondary"
                          }`}
                        >
                          {ESTADO_LABEL[c.estado] ?? c.estado}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableSurface>
        )}

        {lista.length > 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Click una fila para abrir el detalle del CFDI.{" "}
            <Link
              href={`/finanzas/cfdi?cliente=${params.id}`}
              className="text-brand hover:underline"
            >
              Ver todos los CFDI →
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
