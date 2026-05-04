import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  COLOR_ESTADO_PRESTAMO,
  ETIQUETA_ESTADO_PRESTAMO,
  type EstadoPrestamo,
} from "@/lib/prestamos/state";
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
});

export default async function PrestamosListPage({
  searchParams,
}: {
  searchParams?: { linea?: string; estado?: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const puedeSolicitar =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    v.some((vi) => ["director", "operativo"].includes(vi.rol));

  let query = supabase
    .from("prestamos_inter_co")
    .select(
      `id, numero, linea_id, empresa_acreedora_id, empresa_deudora_id, monto, monto_pagado, saldo_pendiente, fecha_solicitud, fecha_ejecucion, fecha_vencimiento, estado, motivo,
       acreedora:empresas!prestamos_inter_co_empresa_acreedora_id_fkey(codigo, razon_social, nombre_comercial),
       deudora:empresas!prestamos_inter_co_empresa_deudora_id_fkey(codigo, razon_social, nombre_comercial)`,
    )
    .order("fecha_solicitud", { ascending: false });

  if (searchParams?.linea) query = query.eq("linea_id", searchParams.linea);
  if (searchParams?.estado) query = query.eq("estado", searchParams.estado as EstadoPrestamo);

  const { data: prestamos } = await query;

  const estados: EstadoPrestamo[] = [
    "solicitado",
    "aprobado",
    "ejecutado",
    "confirmado",
    "pagado_parcial",
    "pagado_total",
    "cancelado",
  ];

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
          <h1 className="mt-2 text-2xl font-semibold leading-tight">
            Préstamos inter-co
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Disposiciones individuales sobre las líneas de crédito.
          </p>
        </div>
        {puedeSolicitar && (
          <Link href="/finanzas/tesoreria/prestamos/nuevo">
            <Button>Solicitar préstamo</Button>
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/finanzas/tesoreria/prestamos">
          <button
            className={`rounded-md px-3 py-1 text-[11px] font-medium transition ${
              !searchParams?.estado
                ? "bg-brand text-brand-fg"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3"
            }`}
          >
            Todos
          </button>
        </Link>
        {estados.map((e) => (
          <Link key={e} href={`/finanzas/tesoreria/prestamos?estado=${e}`}>
            <button
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition ${
                searchParams?.estado === e
                  ? "bg-brand text-brand-fg"
                  : "bg-bg-2 text-ink-2 hover:bg-bg-3"
              }`}
            >
              {ETIQUETA_ESTADO_PRESTAMO[e]}
            </button>
          </Link>
        ))}
      </div>

      {(prestamos?.length ?? 0) === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Sin préstamos.
        </div>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Número</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acreedora → Deudora</TableHead>
                <TableHead align="right">Monto</TableHead>
                <TableHead align="right">Saldo</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(prestamos ?? []).map((p) => {
                const estado = p.estado as EstadoPrestamo;
                const monto = Number(p.monto ?? 0);
                const saldo = Number(
                  p.saldo_pendiente ?? monto - Number(p.monto_pagado ?? 0),
                );
                const acr = p.acreedora as unknown as { codigo: string } | null;
                const deu = p.deudora as unknown as { codigo: string } | null;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">
                      {p.numero}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_PRESTAMO[estado]}`}
                      >
                        {ETIQUETA_ESTADO_PRESTAMO[estado]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              empresaCodigoColor[acr?.codigo ?? ""] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          {acr?.codigo}
                        </span>
                        <span className="text-ink-4">→</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              empresaCodigoColor[deu?.codigo ?? ""] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          {deu?.codigo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell align="right" mono>
                      {fmtMxn.format(monto)}
                    </TableCell>
                    <TableCell align="right" mono>
                      {fmtMxn.format(saldo)}
                    </TableCell>
                    <TableCell className="text-xs text-ink-3">
                      <p>
                        Sol:{" "}
                        {new Date(p.fecha_solicitud).toLocaleDateString(
                          "es-MX",
                        )}
                      </p>
                      {p.fecha_vencimiento && (
                        <p>
                          Vto:{" "}
                          {new Date(p.fecha_vencimiento).toLocaleDateString(
                            "es-MX",
                          )}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/finanzas/tesoreria/prestamos/${p.id}`}>
                        <Button size="sm" variant="outline">
                          Ver
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </div>
  );
}
