import { Plus } from "lucide-react";
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
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { empresasDondeCreaOC, obtenerVinculos } from "@/lib/auth/permisos";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
} from "@/lib/empresa-activa";
import { ESTADOS_OC } from "@/lib/oc/state";
import { createClient } from "@/lib/supabase/server";

import { OCToolbar } from "./oc-toolbar";

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
  desde?: string;
  hasta?: string;
  montoMin?: string;
  semaforo?: string;
  agrupar?: string;
  page?: string;
};

const ESTADOS_OC_VALUES = ESTADOS_OC.map((s) => s.value);

export default async function OCPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeCrear = empresasDondeCreaOC(vinculos).length > 0;

  // Filtro por empresa activa del switcher
  const filtro = resolverEmpresasFiltro({
    cookieValue: cookies().get(EMPRESA_COOKIE)?.value ?? null,
    empresasUsuario: vinculos.map((v) => v.empresa_id),
    puedeConsolidado: puedeVerConsolidado(vinculos),
  });

  const sp = searchParams ?? {};
  const q = (sp.q ?? "").trim();
  const estado = sp.estado ?? "";
  const empresaId = sp.empresa ?? "";
  // Default a mes actual si no hay otros filtros de fecha o búsqueda
  const periodo = (sp as { periodo?: string }).periodo ?? "";
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const desde =
    sp.desde ?? (periodo === "todos" || sp.hasta || q ? "" : inicioMes);
  const hasta = sp.hasta ?? (periodo === "todos" || sp.desde || q ? "" : finMes);
  const montoMin = sp.montoMin ?? "";
  const semaforo = sp.semaforo ?? "";
  const agrupar = sp.agrupar ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  let query = supabase
    .from("ordenes_compra")
    .select(
      "id, numero, fecha_emision, total, estado, empresa_id, proveedor_id, comentarios, urgencia, limite_pago, empresa_pagadora_id, empresas(codigo, nombre_comercial), proveedores(razon_social, rfc, semaforo)",
      { count: "exact" },
    )
    .in("empresa_id", filtro.empresasIds)
    .order("fecha_emision", { ascending: false });

  if (estado && (ESTADOS_OC_VALUES as readonly string[]).includes(estado)) {
    query = query.eq("estado", estado as never);
  }
  if (empresaId) query = query.eq("empresa_id", empresaId);
  if (desde) query = query.gte("fecha_emision", desde);
  if (hasta) {
    const finDia = new Date(hasta);
    finDia.setDate(finDia.getDate() + 1);
    query = query.lt("fecha_emision", finDia.toISOString().slice(0, 10));
  }
  if (montoMin) {
    const m = parseFloat(montoMin);
    if (!Number.isNaN(m)) query = query.gte("total", m);
  }
  if (q) {
    query = query.or(`numero.ilike.%${q}%,comentarios.ilike.%${q}%`);
  }

  const paged = agrupar
    ? query.range(0, 4999)
    : query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: ocs, count, error } = await paged;
  let lista = ocs ?? [];

  if (semaforo) {
    lista = lista.filter(
      (oc) =>
        (oc.proveedores as { semaforo: string | null } | null)?.semaforo ===
        semaforo,
    );
  }

  // Refinar búsqueda por proveedor (post-query, los relacionados no entran al .or)
  if (q && lista.length > 0) {
    const ql = q.toLowerCase();
    lista = lista.filter((oc) => {
      const p = oc.proveedores as
        | { razon_social: string; rfc: string }
        | null;
      const numero = (oc.numero ?? "").toLowerCase();
      const com = (oc.comentarios ?? "").toLowerCase();
      const rs = (p?.razon_social ?? "").toLowerCase();
      const rfc = (p?.rfc ?? "").toLowerCase();
      // Si el .or matchó solo en numero/comentarios, este filtro lo deja.
      // Si el match potencial era proveedor, también lo deja.
      return (
        numero.includes(ql) ||
        com.includes(ql) ||
        rs.includes(ql) ||
        rfc.includes(ql)
      );
    });
  }

  const { data: empresasFiltro } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial, razon_social")
    .eq("activa", true)
    .order("codigo");

  const totalGral = lista.reduce((a, oc) => a + Number(oc.total ?? 0), 0);
  const pendAprob = lista.filter((oc) => oc.estado === "pendiente_aprobacion");
  const totalPendAprob = pendAprob.reduce(
    (a, oc) => a + Number(oc.total ?? 0),
    0,
  );
  const aprobadas = lista.filter((oc) =>
    ["aprobada", "enviada", "parcial_recibida", "recibida"].includes(
      oc.estado ?? "",
    ),
  );
  const totalAprob = aprobadas.reduce((a, oc) => a + Number(oc.total ?? 0), 0);
  const pagadas = lista.filter((oc) => oc.estado === "pagada");
  const totalPagadas = pagadas.reduce((a, oc) => a + Number(oc.total ?? 0), 0);

  const totalPaginas = count ? Math.ceil(count / PAGE_SIZE) : 1;

  type GProv = {
    rfc: string;
    nombre: string;
    cantidad: number;
    total: number;
  };
  type GEst = { estado: string; cantidad: number; total: number };
  const gProv = new Map<string, GProv>();
  const gEst = new Map<string, GEst>();
  if (agrupar === "proveedor") {
    for (const oc of lista) {
      const p = oc.proveedores as
        | { razon_social: string; rfc: string }
        | null;
      const key = p?.rfc ?? "—";
      const g = gProv.get(key) ?? {
        rfc: key,
        nombre: p?.razon_social ?? "—",
        cantidad: 0,
        total: 0,
      };
      g.cantidad += 1;
      g.total += Number(oc.total ?? 0);
      gProv.set(key, g);
    }
  } else if (agrupar === "estado") {
    for (const oc of lista) {
      const k = oc.estado ?? "—";
      const g = gEst.get(k) ?? { estado: k, cantidad: 0, total: 0 };
      g.cantidad += 1;
      g.total += Number(oc.total ?? 0);
      gEst.set(k, g);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Administración y Finanzas</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Órdenes de compra
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Compras del grupo · seguimiento de aprobación, recepción y pago.
            {!sp.desde && !sp.hasta && !sp.q && periodo !== "todos" && (
              <>
                {" · "}
                <span className="font-medium text-ink-2">Mostrando este mes</span>
                {" · "}
                <Link
                  href="/finanzas/oc?periodo=todos"
                  className="text-brand hover:underline"
                >
                  Ver todos
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton tipo="oc" desde={desde} hasta={hasta} />
          {puedeCrear && (
            <>
              <Link href="/finanzas/oc/import">
                <Button variant="outline">📊 Importar masivo</Button>
              </Link>
              <Link href="/finanzas/oc/nueva">
                <Button>
                  <Plus className="h-4 w-4" />
                  Nueva OC
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total filtrado"
          value={fmtMxnShort.format(totalGral)}
          sub={`${lista.length} OCs`}
        />
        <KpiCard
          label="Pend. aprobación"
          value={fmtMxnShort.format(totalPendAprob)}
          sub={`${pendAprob.length} OCs`}
          accent={pendAprob.length > 0 ? "warn" : "brand"}
        />
        <KpiCard
          label="Aprobadas / en curso"
          value={fmtMxnShort.format(totalAprob)}
          sub={`${aprobadas.length} OCs`}
        />
        <KpiCard
          label="Pagadas"
          value={fmtMxnShort.format(totalPagadas)}
          sub={`${pagadas.length} OCs`}
          accent="ok"
        />
      </div>

      <div className="mb-6">
        <OCToolbar
          empresas={empresasFiltro ?? []}
          current={{
            q,
            estado,
            empresa: empresaId,
            desde,
            hasta,
            montoMin,
            semaforo,
            agrupar,
          }}
          totalResultados={lista.length}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Error: {error.message}
        </div>
      )}

      {lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          {q || estado || empresaId || desde || hasta
            ? "Sin resultados con los filtros."
            : "Sin órdenes de compra."}
        </div>
      ) : agrupar === "proveedor" ? (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Proveedor (RFC)</TableHead>
                <TableHead align="right">OCs</TableHead>
                <TableHead align="right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(gProv.values())
                .sort((a, b) => b.total - a.total)
                .map((g) => (
                  <TableRow key={g.rfc}>
                    <TableCell>
                      <Link
                        href={`/finanzas/oc?q=${encodeURIComponent(g.rfc)}${desde ? `&desde=${desde}` : ""}${hasta ? `&hasta=${hasta}` : ""}${empresaId ? `&empresa=${empresaId}` : ""}`}
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
                <TableHead align="right">OCs</TableHead>
                <TableHead align="right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(gEst.values())
                .sort((a, b) => b.total - a.total)
                .map((g) => {
                  const e =
                    ESTADOS_OC.find((s) => s.value === g.estado) ??
                    ESTADOS_OC[0];
                  return (
                    <TableRow key={g.estado}>
                      <TableCell>
                        <Link
                          href={`/finanzas/oc?estado=${g.estado}`}
                          className="hover:text-brand"
                        >
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${e.color}`}
                          >
                            {e.label}
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
                  <TableHead>OC</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead align="right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((oc) => {
                  const estadoCfg =
                    ESTADOS_OC.find((s) => s.value === oc.estado) ??
                    ESTADOS_OC[0];
                  const emp = oc.empresas as
                    | { codigo: string; nombre_comercial: string | null }
                    | null;
                  const prov = oc.proveedores as
                    | {
                        razon_social: string;
                        rfc: string;
                        semaforo: string | null;
                      }
                    | null;
                  return (
                    <TableRow
                      key={oc.id}
                      href={`/finanzas/oc/${oc.id}`}
                      linkLabel={`Abrir OC ${oc.numero}`}
                    >
                      <TableCell className="font-mono">
                        <span className="font-medium">{oc.numero}</span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              empresaCodigoColor[emp?.codigo ?? ""] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          {emp?.codigo ?? "?"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p>{prov?.razon_social ?? "—"}</p>
                        <p className="font-mono text-[10px] text-ink-3">
                          {prov?.rfc ?? ""}
                          {prov?.semaforo && (
                            <span
                              className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${
                                prov.semaforo === "verde"
                                  ? "bg-emerald-500"
                                  : prov.semaforo === "amarillo"
                                    ? "bg-amber-500"
                                    : prov.semaforo === "rojo"
                                      ? "bg-red-500"
                                      : "bg-gray-800"
                              }`}
                            />
                          )}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-ink-3">
                        {new Date(oc.fecha_emision).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell align="right" mono>
                        {fmtMxn.format(Number(oc.total))}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${estadoCfg.color}`}
                        >
                          {estadoCfg.label}
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
    return `/finanzas/oc?${params.toString()}`;
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
