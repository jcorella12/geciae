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
import {
  COLOR_ESTADO_COTIZACION,
  ETIQUETA_ESTADO_COTIZACION,
  type EstadoCotizacion,
} from "@/lib/cotizaciones/state";
import { createClient } from "@/lib/supabase/server";

import { CotizacionesToolbar } from "./cotizaciones-toolbar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

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

type SearchParams = {
  q?: string;
  estado?: string;
  empresa?: string;
  cliente?: string;
  desde?: string;
  hasta?: string;
  agrupar?: string;
  page?: string;
};

const ESTADOS_VALUES: EstadoCotizacion[] = [
  "borrador",
  "enviada",
  "aceptada",
  "rechazada",
  "vencida",
  "convertida",
];

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeCrear = vinculos.length > 0; // gate fino se valida en el server action

  const sp = searchParams ?? {};
  const q = (sp.q ?? "").trim();
  const estadoParam = sp.estado ?? "";
  const empresaId = sp.empresa ?? "";
  const clienteId = sp.cliente ?? "";
  const desde = sp.desde ?? "";
  const hasta = sp.hasta ?? "";
  const agrupar = sp.agrupar ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  let query = supabase
    .from("cotizaciones")
    .select(
      "id, empresa_id, cliente_id, numero, version, fecha_emision, fecha_vencimiento, total, estado, empresas(codigo), clientes(razon_social, rfc)",
      { count: "exact" },
    )
    .order("fecha_emision", { ascending: false });

  if (estadoParam && (ESTADOS_VALUES as string[]).includes(estadoParam)) {
    if (estadoParam === "vencida") {
      // vencida es estado computado: borrador/enviada con fecha pasada
      query = query
        .in("estado", ["borrador", "enviada"])
        .lt("fecha_vencimiento", new Date().toISOString().slice(0, 10));
    } else {
      query = query.eq("estado", estadoParam);
    }
  }
  if (empresaId) query = query.eq("empresa_id", empresaId);
  if (clienteId) query = query.eq("cliente_id", clienteId);
  if (desde) query = query.gte("fecha_emision", desde);
  if (hasta) {
    const finDia = new Date(hasta);
    finDia.setDate(finDia.getDate() + 1);
    query = query.lt("fecha_emision", finDia.toISOString().slice(0, 10));
  }
  if (q) {
    query = query.ilike("numero", `%${q}%`);
  }

  const paged = agrupar
    ? query.range(0, 4999)
    : query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: cots, count, error } = await paged;
  let lista = cots ?? [];

  // Refinamiento client-side por cliente (no se puede .or sobre relacionado)
  if (q && lista.length > 0) {
    const ql = q.toLowerCase();
    lista = lista.filter((c) => {
      const cli = c.clientes as
        | { razon_social: string; rfc: string }
        | null;
      const numero = (c.numero ?? "").toLowerCase();
      const rs = (cli?.razon_social ?? "").toLowerCase();
      const rfc = (cli?.rfc ?? "").toLowerCase();
      return numero.includes(ql) || rs.includes(ql) || rfc.includes(ql);
    });
  }

  const hoyStr = new Date().toISOString().slice(0, 10);
  const conComputado = lista.map((c) => {
    const cli = c.clientes as { razon_social: string; rfc: string } | null;
    const emp = c.empresas as { codigo: string } | null;
    const estadoBase = c.estado as EstadoCotizacion;
    const esVencida =
      (estadoBase === "borrador" || estadoBase === "enviada") &&
      c.fecha_vencimiento != null &&
      (c.fecha_vencimiento as string) < hoyStr;
    return {
      ...c,
      cliente_razon_social: cli?.razon_social ?? null,
      cliente_rfc: cli?.rfc ?? null,
      empresa_codigo: emp?.codigo ?? null,
      estado_computado: esVencida ? ("vencida" as EstadoCotizacion) : estadoBase,
    };
  });

  const [{ data: empresasFiltro }, { data: clientesFiltro }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, nombre_comercial, razon_social")
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("clientes")
      .select("id, razon_social, rfc")
      .eq("activo", true)
      .order("razon_social")
      .limit(500),
  ]);

  // KPIs
  const borradores = conComputado.filter((c) => c.estado === "borrador");
  const enviadas = conComputado.filter((c) => c.estado === "enviada");
  const aceptadas = conComputado.filter((c) => c.estado === "aceptada");
  const convertidas = conComputado.filter((c) => c.estado === "convertida");
  const totalAceptado =
    aceptadas.reduce((a, c) => a + Number(c.total ?? 0), 0) +
    convertidas.reduce((a, c) => a + Number(c.total ?? 0), 0);
  const totalEnviadas = enviadas.reduce(
    (a, c) => a + Number(c.total ?? 0),
    0,
  );
  const totalPaginas = count ? Math.ceil(count / PAGE_SIZE) : 1;

  type GCli = { rfc: string; nombre: string; cantidad: number; total: number };
  type GEst = { estado: string; cantidad: number; total: number };
  const gCli = new Map<string, GCli>();
  const gEst = new Map<string, GEst>();
  if (agrupar === "cliente") {
    for (const c of conComputado) {
      const key = c.cliente_rfc ?? "—";
      const g = gCli.get(key) ?? {
        rfc: key,
        nombre: c.cliente_razon_social ?? "—",
        cantidad: 0,
        total: 0,
      };
      g.cantidad += 1;
      g.total += Number(c.total ?? 0);
      gCli.set(key, g);
    }
  } else if (agrupar === "estado") {
    for (const c of conComputado) {
      const k = c.estado_computado ?? c.estado ?? "—";
      const g = gEst.get(k) ?? { estado: k, cantidad: 0, total: 0 };
      g.cantidad += 1;
      g.total += Number(c.total ?? 0);
      gEst.set(k, g);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Comercial</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Cotizaciones
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Propuestas comerciales del grupo · borradores, enviadas, aceptadas y
            convertidas a proyecto.
          </p>
        </div>
        {puedeCrear && (
          <Link href="/comercial/cotizaciones/nueva">
            <Button>
              <Plus className="h-4 w-4" />
              Nueva cotización
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Borradores"
          value={String(borradores.length)}
          sub={`${fmtMxnShort.format(borradores.reduce((a, c) => a + Number(c.total ?? 0), 0))} potencial`}
        />
        <KpiCard
          label="Enviadas a cliente"
          value={String(enviadas.length)}
          sub={fmtMxnShort.format(totalEnviadas)}
          accent={enviadas.length > 0 ? "warn" : "brand"}
        />
        <KpiCard
          label="Aceptadas"
          value={String(aceptadas.length + convertidas.length)}
          sub={fmtMxnShort.format(totalAceptado)}
          accent="ok"
        />
        <KpiCard
          label="Total filtrado"
          value={fmtMxnShort.format(
            conComputado.reduce((a, c) => a + Number(c.total ?? 0), 0),
          )}
          sub={`${conComputado.length} cotización${conComputado.length === 1 ? "" : "es"}`}
        />
      </div>

      <div className="mb-6">
        <CotizacionesToolbar
          empresas={empresasFiltro ?? []}
          clientes={clientesFiltro ?? []}
          current={{
            q,
            estado: estadoParam,
            empresa: empresaId,
            cliente: clienteId,
            desde,
            hasta,
            agrupar,
          }}
          totalResultados={conComputado.length}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Error: {error.message}
        </div>
      )}

      {conComputado.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          {q || estadoParam || empresaId || clienteId || desde || hasta
            ? "Sin resultados con los filtros."
            : "Sin cotizaciones aún. Crea la primera para empezar."}
        </div>
      ) : agrupar === "cliente" ? (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Cliente (RFC)</TableHead>
                <TableHead align="right">Cotizaciones</TableHead>
                <TableHead align="right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(gCli.values())
                .sort((a, b) => b.total - a.total)
                .map((g) => (
                  <TableRow key={g.rfc}>
                    <TableCell>
                      <Link
                        href={`/comercial/cotizaciones?q=${encodeURIComponent(g.rfc)}`}
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
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableSurface>
      ) : agrupar === "estado" ? (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Estado</TableHead>
                <TableHead align="right">Cotizaciones</TableHead>
                <TableHead align="right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(gEst.values())
                .sort((a, b) => b.total - a.total)
                .map((g) => {
                  const est = g.estado as EstadoCotizacion;
                  return (
                    <TableRow key={g.estado}>
                      <TableCell>
                        <Link
                          href={`/comercial/cotizaciones?estado=${g.estado}`}
                          className="hover:text-brand"
                        >
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_COTIZACION[est] ?? "bg-gray-100 text-gray-700"}`}
                          >
                            {ETIQUETA_ESTADO_COTIZACION[est] ?? g.estado}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell align="right" mono>
                        {g.cantidad}
                      </TableCell>
                      <TableCell align="right" mono>
                        {fmtMxn.format(g.total)}
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
                  <TableHead>Número</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Emisión</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead align="right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conComputado.map((c) => {
                  const est = (c.estado_computado ?? c.estado) as EstadoCotizacion;
                  const codigo = c.empresa_codigo;
                  const venceLabel =
                    c.fecha_vencimiento &&
                    new Date(c.fecha_vencimiento as string).toLocaleDateString(
                      "es-MX",
                    );
                  return (
                    <TableRow
                      key={c.id}
                      href={`/comercial/cotizaciones/${c.id}`}
                      linkLabel={`Abrir cotización ${c.numero}`}
                    >
                      <TableCell className="font-mono">
                        <span className="font-medium">
                          {c.numero}
                          {(c.version ?? 1) > 1 && (
                            <span className="ml-1 text-[10px] text-ink-3">
                              v{c.version}
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              empresaCodigoColor[codigo ?? ""] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          {codigo ?? "?"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p>{c.cliente_razon_social ?? "—"}</p>
                        <p className="font-mono text-[10px] text-ink-3">
                          {c.cliente_rfc ?? ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-ink-3">
                        {new Date(
                          c.fecha_emision as string,
                        ).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell className="text-xs text-ink-3">
                        {venceLabel ?? "—"}
                      </TableCell>
                      <TableCell align="right" mono>
                        {fmtMxn.format(Number(c.total ?? 0))}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_COTIZACION[est] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {ETIQUETA_ESTADO_COTIZACION[est] ?? est}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableSurface>

          {totalPaginas > 1 && (
            <Pagination
              page={page}
              total={totalPaginas}
              count={count ?? 0}
              sp={sp}
            />
          )}
        </>
      )}
    </div>
  );
}

function Pagination({
  page,
  total,
  count,
  sp,
}: {
  page: number;
  total: number;
  count: number;
  sp: SearchParams;
}) {
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);
  const link = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== "page") params.set(k, String(v));
    }
    params.set("page", String(p));
    return `/comercial/cotizaciones?${params.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-[12px] text-ink-3">
        {from.toLocaleString("es-MX")}–{to.toLocaleString("es-MX")} de{" "}
        {count.toLocaleString("es-MX")}
      </span>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <Link
            href={link(page - 1)}
            className="rounded-md border border-border bg-card px-2 py-1 text-[12px] hover:bg-bg-2"
          >
            ‹ Anterior
          </Link>
        )}
        <span className="px-2 text-[12px]">
          Página {page} de {total}
        </span>
        {page < total && (
          <Link
            href={link(page + 1)}
            className="rounded-md border border-border bg-card px-2 py-1 text-[12px] hover:bg-bg-2"
          >
            Siguiente ›
          </Link>
        )}
      </div>
    </div>
  );
}
