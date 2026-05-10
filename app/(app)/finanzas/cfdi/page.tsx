import { ArrowDownToLine, ArrowUpFromLine, Plus } from "lucide-react";
import { cookies } from "next/headers";
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
import { BotonBulkMesActual } from "@/app/(app)/configuracion/sat/boton-bulk-mes";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { ExportContpaqiButton } from "./export-contpaqi-button";
import { obtenerVinculos } from "@/lib/auth/permisos";
import {
  COLOR_ESTADO_CFDI,
  ETIQUETA_ESTADO_CFDI,
  ETIQUETA_TIPO_CFDI,
  type EstadoCfdi,
  type TipoCfdi,
} from "@/lib/cfdi/state";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
} from "@/lib/empresa-activa";
import { createClient } from "@/lib/supabase/server";

import { CfdiToolbar } from "./cfdi-toolbar";

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

const fmtMxnShort = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type SearchParams = {
  q?: string;
  direccion?: string;
  estado?: string;
  empresa?: string;
  desde?: string;
  hasta?: string;
  formaPago?: string;
  montoMin?: string;
  agrupar?: string;
  page?: string;
};

const PAGE_SIZE = 100;

export default async function CfdiListPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const filtroEmpresa = resolverEmpresasFiltro({
    cookieValue: cookies().get(EMPRESA_COOKIE)?.value ?? null,
    empresasUsuario: vinculos.map((v) => v.empresa_id),
    puedeConsolidado: puedeVerConsolidado(vinculos),
  });

  // ¿El usuario puede disparar descargas SAT? (CEO + atributo contralor)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puedeSat } = await (supabase as any).rpc(
    "usuario_puede_gestionar_sat",
  );

  const sp = searchParams ?? {};
  const q = (sp.q ?? "").trim();
  const direccion = sp.direccion ?? "";
  const estado = sp.estado ?? "";
  const empresaId = sp.empresa ?? "";
  // Default: mes actual si no se especifica fecha y no hay otro filtro relevante.
  // Permite "todos" pasando ?desde=&hasta=&periodo=todos
  const periodo = (sp as { periodo?: string }).periodo ?? "";
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const desde =
    sp.desde ??
    (periodo === "todos" || sp.hasta || q ? "" : inicioMes);
  const hasta = sp.hasta ?? (periodo === "todos" || sp.desde || q ? "" : finMes);
  const formaPago = sp.formaPago ?? "";
  const montoMin = sp.montoMin ?? "";
  const agrupar = sp.agrupar ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .eq("activa", true)
    .order("codigo");

  // Construir query base
  let query = supabase
    .from("cfdi")
    .select(
      `id, empresa_id, tipo, es_emitido, serie, folio, uuid_sat, fecha_emision,
       rfc_emisor, nombre_emisor, rfc_receptor, nombre_receptor, total,
       monto_pagado, saldo_pendiente, estado, metodo_pago, forma_pago,
       empresas(codigo)`,
      { count: "exact" },
    )
    .in("empresa_id", filtroEmpresa.empresasIds)
    .order("fecha_emision", { ascending: false });

  if (direccion === "emitidos") query = query.eq("es_emitido", true);
  if (direccion === "recibidos") query = query.eq("es_emitido", false);
  if (estado) query = query.eq("estado", estado as EstadoCfdi);
  if (empresaId) query = query.eq("empresa_id", empresaId);
  if (desde) query = query.gte("fecha_emision", desde);
  if (hasta) {
    // hasta inclusive
    const finDia = new Date(hasta);
    finDia.setDate(finDia.getDate() + 1);
    query = query.lt("fecha_emision", finDia.toISOString().slice(0, 10));
  }
  if (formaPago) query = query.eq("metodo_pago", formaPago);
  if (montoMin) {
    const m = parseFloat(montoMin);
    if (!Number.isNaN(m)) query = query.gte("total", m);
  }
  if (q) {
    // Búsqueda en múltiples campos: rfc, razón social, folio, uuid, serie
    const qLower = q.replace(/['"]/g, "");
    query = query.or(
      `rfc_emisor.ilike.%${qLower}%,nombre_emisor.ilike.%${qLower}%,` +
      `rfc_receptor.ilike.%${qLower}%,nombre_receptor.ilike.%${qLower}%,` +
      `folio.ilike.%${qLower}%,serie.ilike.%${qLower}%,` +
      `uuid_sat::text.ilike.%${qLower}%`,
    );
  }

  // Para vista lista: paginar
  let paged = query;
  if (!agrupar) {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    paged = query.range(from, to);
  } else {
    // Agrupación: traer hasta 5000 (UI agrega en memoria)
    paged = query.range(0, 4999);
  }

  const { data: cfdis, count, error } = await paged;
  const lista = cfdis ?? [];

  // KPIs sobre TODOS los resultados filtrados (no solo la página)
  // Para no traer todo, hago una query agregada separada
  const { data: kpiRaw } = await supabase.rpc("cfdi_kpis_filtrados", {
    p_q: q || undefined,
    p_direccion: direccion || undefined,
    p_estado: estado || undefined,
    p_empresa_id: empresaId || undefined,
    p_desde: desde || undefined,
    p_hasta: hasta || undefined,
    p_forma_pago: formaPago || undefined,
    p_monto_min: montoMin ? parseFloat(montoMin) : undefined,
  });
  // Si la función RPC no existe aún, calcular sobre la página visible
  const kpis = (kpiRaw as
    | {
        total_emitido: number;
        total_recibido: number;
        cxc: number;
        cxp: number;
        iva_trasladado: number;
        iva_acreditable: number;
        n_emitidos: number;
        n_recibidos: number;
      }[]
    | null)?.[0] ?? {
    total_emitido: lista
      .filter((c) => c.es_emitido && c.estado !== "cancelado")
      .reduce((a, c) => a + Number(c.total ?? 0), 0),
    total_recibido: lista
      .filter((c) => !c.es_emitido && c.estado !== "cancelado")
      .reduce((a, c) => a + Number(c.total ?? 0), 0),
    cxc: lista
      .filter(
        (c) =>
          c.es_emitido &&
          c.estado === "timbrado" &&
          Number(c.saldo_pendiente ?? 0) > 0,
      )
      .reduce((a, c) => a + Number(c.saldo_pendiente ?? 0), 0),
    cxp: lista
      .filter(
        (c) =>
          !c.es_emitido &&
          c.estado === "timbrado" &&
          Number(c.saldo_pendiente ?? 0) > 0,
      )
      .reduce((a, c) => a + Number(c.saldo_pendiente ?? 0), 0),
    iva_trasladado: 0,
    iva_acreditable: 0,
    n_emitidos: lista.filter((c) => c.es_emitido).length,
    n_recibidos: lista.filter((c) => !c.es_emitido).length,
  };

  // Agrupación en memoria (cuando agrupar !== "")
  type GrupoContraparte = {
    rfc: string;
    nombre: string;
    cantidad: number;
    total: number;
    pendiente: number;
  };
  type GrupoMes = {
    mes: string; // YYYY-MM
    label: string;
    cantidad: number;
    emitido: number;
    recibido: number;
  };

  const gruposContraparte = new Map<string, GrupoContraparte>();
  const gruposMes = new Map<string, GrupoMes>();

  if (agrupar === "contraparte") {
    for (const c of lista) {
      const rfc = (c.es_emitido ? c.rfc_receptor : c.rfc_emisor) ?? "—";
      const nombre = (c.es_emitido ? c.nombre_receptor : c.nombre_emisor) ?? rfc;
      const g = gruposContraparte.get(rfc) ?? {
        rfc,
        nombre,
        cantidad: 0,
        total: 0,
        pendiente: 0,
      };
      g.cantidad += 1;
      if (c.estado !== "cancelado") {
        g.total += Number(c.total ?? 0);
        g.pendiente += Number(c.saldo_pendiente ?? 0);
      }
      gruposContraparte.set(rfc, g);
    }
  }
  if (agrupar === "mes") {
    for (const c of lista) {
      if (!c.fecha_emision) continue;
      const d = new Date(c.fecha_emision);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const g = gruposMes.get(key) ?? {
        mes: key,
        label: `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`,
        cantidad: 0,
        emitido: 0,
        recibido: 0,
      };
      g.cantidad += 1;
      if (c.estado !== "cancelado") {
        if (c.es_emitido) g.emitido += Number(c.total ?? 0);
        else g.recibido += Number(c.total ?? 0);
      }
      gruposMes.set(key, g);
    }
  }

  const grupoContraSorted = Array.from(gruposContraparte.values()).sort(
    (a, b) => b.total - a.total,
  );
  const grupoMesSorted = Array.from(gruposMes.values()).sort(
    (a, b) => b.mes.localeCompare(a.mes),
  );

  // Paginación
  const totalPaginas = count ? Math.ceil(count / PAGE_SIZE) : 1;
  const fmtRangoPagina = () => {
    if (!count || agrupar) return "";
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, count);
    return `${from.toLocaleString("es-MX")}–${to.toLocaleString("es-MX")} de ${count.toLocaleString("es-MX")}`;
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Administración y Finanzas</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            CFDI · facturas
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Búsqueda y análisis de comprobantes emitidos y recibidos.
            {!sp.desde && !sp.hasta && !sp.q && periodo !== "todos" && (
              <>
                {" · "}
                <span className="font-medium text-ink-2">
                  Mostrando este mes
                </span>
                {" · "}
                <Link
                  href="?periodo=todos"
                  className="text-brand hover:underline"
                >
                  Ver todos
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {puedeSat && <BotonBulkMesActual variant="outline" />}
          <ExportCsvButton tipo="cfdi" desde={desde} hasta={hasta} />
          <ExportContpaqiButton empresas={empresas ?? []} />
          <Link href="/finanzas/cfdi/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Registrar CFDI
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Emitidos (filtrado)"
          value={fmtMxnShort.format(Number(kpis.total_emitido))}
          sub={`${Number(kpis.n_emitidos).toLocaleString("es-MX")} CFDIs`}
          accent="ok"
        />
        <KpiCard
          label="Recibidos (filtrado)"
          value={fmtMxnShort.format(Number(kpis.total_recibido))}
          sub={`${Number(kpis.n_recibidos).toLocaleString("es-MX")} CFDIs`}
          accent="warn"
        />
        <KpiCard
          label="Por cobrar"
          value={fmtMxnShort.format(Number(kpis.cxc))}
          sub="CxC pendiente"
          accent={Number(kpis.cxc) > 0 ? "warn" : "brand"}
        />
        <KpiCard
          label="Por pagar"
          value={fmtMxnShort.format(Number(kpis.cxp))}
          sub="CxP pendiente"
          accent={Number(kpis.cxp) > 0 ? "danger" : "brand"}
        />
      </div>

      {/* Toolbar */}
      <div className="mb-6">
        <CfdiToolbar
          empresas={empresas ?? []}
          current={{
            q,
            direccion,
            estado,
            empresa: empresaId,
            desde,
            hasta,
            formaPago,
            montoMin,
            agrupar,
          }}
          totalResultados={count ?? 0}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Error: {error.message}
        </div>
      )}

      {/* Resultados */}
      {lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          {q || empresaId || desde || hasta || estado || formaPago
            ? "Sin resultados con los filtros seleccionados."
            : "Sin CFDIs cargados."}
        </div>
      ) : agrupar === "contraparte" ? (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Contraparte (RFC)</TableHead>
                <TableHead align="right">CFDIs</TableHead>
                <TableHead align="right">Total</TableHead>
                <TableHead align="right">Pendiente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupoContraSorted.map((g) => (
                <TableRow key={g.rfc}>
                  <TableCell>
                    <Link
                      href={`/finanzas/cfdi?q=${encodeURIComponent(g.rfc)}${desde ? `&desde=${desde}` : ""}${hasta ? `&hasta=${hasta}` : ""}${empresaId ? `&empresa=${empresaId}` : ""}${direccion ? `&direccion=${direccion}` : ""}`}
                      className="font-medium hover:text-brand"
                    >
                      {g.nombre}
                    </Link>
                    <p className="font-mono text-[11px] text-ink-3">{g.rfc}</p>
                  </TableCell>
                  <TableCell align="right" mono>
                    {g.cantidad}
                  </TableCell>
                  <TableCell align="right" mono>
                    {fmtMxn.format(g.total)}
                  </TableCell>
                  <TableCell align="right" mono>
                    {g.pendiente > 0.01 ? (
                      <span className="text-warn-deep">
                        {fmtMxn.format(g.pendiente)}
                      </span>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableSurface>
      ) : agrupar === "mes" ? (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Mes</TableHead>
                <TableHead align="right">CFDIs</TableHead>
                <TableHead align="right">Emitido</TableHead>
                <TableHead align="right">Recibido</TableHead>
                <TableHead align="right">Margen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupoMesSorted.map((g) => {
                const margen = g.emitido - g.recibido;
                return (
                  <TableRow key={g.mes}>
                    <TableCell>
                      <Link
                        href={`/finanzas/cfdi?desde=${g.mes}-01&hasta=${g.mes}-31${empresaId ? `&empresa=${empresaId}` : ""}${direccion ? `&direccion=${direccion}` : ""}`}
                        className="font-medium hover:text-brand"
                      >
                        {g.label}
                      </Link>
                    </TableCell>
                    <TableCell align="right" mono>
                      {g.cantidad}
                    </TableCell>
                    <TableCell align="right" mono>
                      <span className="text-ok-deep">
                        {fmtMxn.format(g.emitido)}
                      </span>
                    </TableCell>
                    <TableCell align="right" mono>
                      <span className="text-warn-deep">
                        {fmtMxn.format(g.recibido)}
                      </span>
                    </TableCell>
                    <TableCell align="right" mono>
                      <span
                        className={
                          margen >= 0 ? "text-ok-deep font-medium" : "text-danger-deep font-medium"
                        }
                      >
                        {margen >= 0 ? "+" : ""}
                        {fmtMxn.format(margen)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableSurface>
      ) : (
        <>
          <TableSurface>
            <Table>
              <TableHeader>
                <TableRow interactive={false}>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="w-[40px]" />
                  <TableHead>Folio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Contraparte</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead align="right">Total</TableHead>
                  <TableHead align="right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => {
                  const emp = c.empresas as { codigo: string } | null;
                  const contraparte = c.es_emitido
                    ? c.nombre_receptor
                    : c.nombre_emisor;
                  const rfcContraparte = c.es_emitido
                    ? c.rfc_receptor
                    : c.rfc_emisor;
                  const saldo = Number(c.saldo_pendiente ?? c.total ?? 0);
                  return (
                    <TableRow
                      key={c.id}
                      href={`/finanzas/cfdi/${c.id}`}
                      linkLabel={`Abrir CFDI ${c.serie ?? ""}${c.folio ?? ""}`}
                    >
                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              empresaCodigoColor[emp?.codigo ?? ""] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          {emp?.codigo ?? "?"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {c.es_emitido ? (
                          <ArrowUpFromLine
                            className="h-3.5 w-3.5 text-ok-deep"
                            aria-label="Emitido"
                          />
                        ) : (
                          <ArrowDownToLine
                            className="h-3.5 w-3.5 text-warn-deep"
                            aria-label="Recibido"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-xs">
                          {c.serie}
                          {c.folio ?? ""}
                        </p>
                        {c.uuid_sat && (
                          <p className="font-mono text-[10px] text-ink-3">
                            {String(c.uuid_sat).slice(0, 8)}…
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-ink-3">
                        {c.fecha_emision
                          ? new Date(c.fecha_emision).toLocaleDateString(
                              "es-MX",
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="line-clamp-1 max-w-[280px]">
                          {contraparte ?? "—"}
                        </p>
                        <p className="font-mono text-[10px] text-ink-3">
                          {rfcContraparte}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs">
                        {ETIQUETA_TIPO_CFDI[c.tipo as TipoCfdi]}
                        {c.metodo_pago && (
                          <p className="text-[10px] text-ink-3">
                            {c.metodo_pago}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_CFDI[c.estado as EstadoCfdi]}`}
                        >
                          {ETIQUETA_ESTADO_CFDI[c.estado as EstadoCfdi]}
                        </span>
                      </TableCell>
                      <TableCell align="right" mono>
                        {fmtMxn.format(Number(c.total ?? 0))}
                      </TableCell>
                      <TableCell align="right" mono>
                        {saldo > 0.01 ? (
                          <span className="text-warn-deep">
                            {fmtMxn.format(saldo)}
                          </span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableSurface>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[12px] text-ink-3">{fmtRangoPagina()}</span>
              <div className="flex items-center gap-1">
                <PageLink page={1} current={page} sp={sp}>
                  ‹‹
                </PageLink>
                <PageLink
                  page={Math.max(1, page - 1)}
                  current={page}
                  disabled={page === 1}
                  sp={sp}
                >
                  ‹ Anterior
                </PageLink>
                <span className="px-2 text-[12px]">
                  Página {page} de {totalPaginas}
                </span>
                <PageLink
                  page={Math.min(totalPaginas, page + 1)}
                  current={page}
                  disabled={page === totalPaginas}
                  sp={sp}
                >
                  Siguiente ›
                </PageLink>
                <PageLink page={totalPaginas} current={page} sp={sp}>
                  ››
                </PageLink>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PageLink({
  page,
  current,
  sp,
  disabled,
  children,
}: {
  page: number;
  current: number;
  sp: SearchParams;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled || page === current) {
    return (
      <span className="rounded-md px-2 py-1 text-[12px] text-ink-4">
        {children}
      </span>
    );
  }
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) params.set(k, String(v));
  }
  params.set("page", String(page));
  return (
    <Link
      href={`/finanzas/cfdi?${params.toString()}`}
      className="rounded-md border border-border bg-card px-2 py-1 text-[12px] hover:bg-bg-2"
    >
      {children}
    </Link>
  );
}
