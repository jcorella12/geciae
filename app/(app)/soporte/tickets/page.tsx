import { Plus } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { ExportCsvButton } from "@/components/shared/export-csv-button";
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
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
} from "@/lib/empresa-activa";
import { createClient } from "@/lib/supabase/server";
import {
  COLOR_ESTADO_TICKET,
  COLOR_PRIORIDAD_TICKET,
  ETIQUETA_ESTADO_TICKET,
  ETIQUETA_PRIORIDAD_TICKET,
  type EstadoTicket,
  type PrioridadTicket,
} from "@/lib/tickets/state";

export const dynamic = "force-dynamic";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtFecha = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : "—";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { empresa?: string; estado?: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const filtroEmp = resolverEmpresasFiltro({
    cookieValue: cookies().get(EMPRESA_COOKIE)?.value ?? null,
    empresasUsuario: Array.from(new Set(v.map((x) => x.empresa_id))),
    puedeConsolidado: puedeVerConsolidado(v),
  });

  let q = supabase
    .from("tickets_soporte")
    .select(
      "id, numero, asunto, prioridad, estado, asignado_id, created_at, fecha_resolucion, empresa_id, cliente_id, empresas(codigo), clientes(razon_social, nombre_comercial)",
    )
    .in("empresa_id", filtroEmp.empresasIds)
    .order("created_at", { ascending: false })
    .limit(100);

  if (searchParams.empresa)
    q = q.eq("empresa_id", searchParams.empresa);
  if (searchParams.estado)
    q = q.eq(
      "estado",
      searchParams.estado as EstadoTicket,
    );

  const { data: tickets } = await q;
  const lista = tickets ?? [];

  // KPIs
  const abiertos = lista.filter((t) => t.estado === "abierto").length;
  const enProceso = lista.filter((t) => t.estado === "en_proceso").length;
  const criticos = lista.filter(
    (t) =>
      t.prioridad === "critica" &&
      t.estado !== "resuelto" &&
      t.estado !== "cerrado",
  ).length;
  const cerradosMes = lista.filter((t) => {
    if (t.estado !== "cerrado" && t.estado !== "resuelto") return false;
    if (!t.fecha_resolucion) return false;
    const f = new Date(t.fecha_resolucion);
    const hoy = new Date();
    return (
      f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear()
    );
  }).length;

  const empresasIdsAll = Array.from(new Set(v.map((x) => x.empresa_id)));
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo")
    .in("id", empresasIdsAll)
    .eq("activa", true);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">
            Tickets de soporte
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Servicio post-venta, incidencias, no conformidades y solicitudes de
            clientes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton tipo="tickets" />
          <Button asChild>
            <Link href="/soporte/tickets/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo ticket
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Abiertos"
          value={abiertos}
          accent={abiertos > 0 ? "warn" : "brand"}
        />
        <KpiCard label="En proceso" value={enProceso} />
        <KpiCard
          label="Críticos sin resolver"
          value={criticos}
          accent={criticos > 0 ? "danger" : "ok"}
        />
        <KpiCard label="Cerrados este mes" value={cerradosMes} accent="ok" />
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-divider bg-bg-2/40 px-3 py-2">
        <span className="text-[11px] font-medium text-ink-3">Empresa:</span>
        <Link
          href="/soporte/tickets"
          className={`rounded-full px-2 py-0.5 text-[11px] ${!searchParams.empresa ? "bg-ink-1 text-bg-1" : "bg-card text-ink-2"}`}
        >
          Todas
        </Link>
        {(empresas ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/soporte/tickets?empresa=${e.id}`}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${searchParams.empresa === e.id ? "bg-ink-1 text-bg-1" : "bg-card text-ink-2"}`}
          >
            {e.codigo}
          </Link>
        ))}
        <span className="ml-3 text-[11px] font-medium text-ink-3">
          Estado:
        </span>
        {(["abierto", "en_proceso", "esperando_cliente", "resuelto"] as const).map(
          (s) => (
            <Link
              key={s}
              href={`/soporte/tickets?estado=${s}${searchParams.empresa ? `&empresa=${searchParams.empresa}` : ""}`}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${searchParams.estado === s ? "bg-ink-1 text-bg-1" : COLOR_ESTADO_TICKET[s]}`}
            >
              {ETIQUETA_ESTADO_TICKET[s]}
            </Link>
          ),
        )}
      </div>

      {lista.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Sin tickets registrados.{" "}
          <Link
            href="/soporte/tickets/nuevo"
            className="text-brand hover:underline"
          >
            Crear el primero →
          </Link>
        </p>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Número</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((t) => {
                const empresa = t.empresas as { codigo: string } | null;
                const cliente = t.clientes as
                  | { razon_social: string; nombre_comercial: string | null }
                  | null;
                const estado = t.estado as EstadoTicket;
                const prio = t.prioridad as PrioridadTicket;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/soporte/tickets/${t.id}`}
                        className="text-brand hover:underline"
                      >
                        {t.numero}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${empresaCodigoColor[empresa?.codigo ?? ""] ?? "bg-muted-foreground"}`}
                        />
                        {empresa?.codigo}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {cliente?.nombre_comercial ?? cliente?.razon_social ?? "—"}
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-1 max-w-md text-[12.5px]">
                        {t.asunto}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_PRIORIDAD_TICKET[prio]}`}
                      >
                        {ETIQUETA_PRIORIDAD_TICKET[prio]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_ESTADO_TICKET[estado]}`}
                      >
                        {ETIQUETA_ESTADO_TICKET[estado]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-ink-3">
                      {fmtFecha(t.created_at)}
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
