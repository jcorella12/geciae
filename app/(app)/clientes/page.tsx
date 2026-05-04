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
import {
  obtenerVinculos,
  puedeGestionarClientes,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { ClientesToolbar } from "./clientes-toolbar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const riesgoColor: Record<string, string> = {
  bajo: "bg-emerald-500",
  medio: "bg-amber-500",
  alto: "bg-red-500",
};

const riesgoBadge: Record<string, string> = {
  bajo: "bg-emerald-100 text-emerald-700",
  medio: "bg-amber-100 text-amber-700",
  alto: "bg-red-100 text-red-700",
};

function scoreBadgeClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return "bg-bg-2 text-ink-3";
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

type SearchParams = {
  q?: string;
  tipo?: string;
  riesgo?: string;
  activo?: string;
  score_min?: string;
  agrupar?: string;
  page?: string;
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeGestionar = puedeGestionarClientes(vinculos);

  const sp = searchParams ?? {};
  const q = (sp.q ?? "").trim();
  const tipo = sp.tipo ?? "";
  const riesgo = sp.riesgo ?? "";
  const activo = sp.activo ?? "";
  const scoreMinRaw = sp.score_min ?? "";
  const scoreMin = scoreMinRaw ? parseInt(scoreMinRaw, 10) : NaN;
  const agrupar = sp.agrupar ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  let query = supabase
    .from("clientes")
    .select(
      "id, razon_social, nombre_comercial, rfc, tipo, segmento, riesgo, score_pago, score_satisfaccion, activo, created_at",
      { count: "exact" },
    )
    .order("razon_social", { ascending: true });

  if (activo === "true") query = query.eq("activo", true);
  if (activo === "false") query = query.eq("activo", false);
  if (tipo) query = query.eq("tipo", tipo);
  if (riesgo) query = query.eq("riesgo", riesgo);
  if (!Number.isNaN(scoreMin) && scoreMin > 0) {
    query = query.gte("score_pago", scoreMin);
  }
  if (q) {
    query = query.or(
      `razon_social.ilike.%${q}%,nombre_comercial.ilike.%${q}%,rfc.ilike.%${q}%`,
    );
  }

  const paged = agrupar
    ? query.range(0, 4999)
    : query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: clientes, count, error } = await paged;
  const lista = clientes ?? [];

  const [
    { count: cActivos },
    { count: cComerciales },
    { count: cIndustriales },
    { count: cRiesgoAlto },
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("activo", true),
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "comercial")
      .eq("activo", true),
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "industrial")
      .eq("activo", true),
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("riesgo", "alto")
      .eq("activo", true),
  ]);

  const totalPaginas = count ? Math.ceil(count / PAGE_SIZE) : 1;
  type GTipo = {
    tipo: string;
    cantidad: number;
    riesgos: Record<string, number>;
  };
  type GRiesgo = { riesgo: string; cantidad: number };
  const gTipo = new Map<string, GTipo>();
  const gRiesgo = new Map<string, GRiesgo>();
  if (agrupar === "tipo") {
    for (const c of lista) {
      const t = c.tipo ?? "—";
      const g = gTipo.get(t) ?? { tipo: t, cantidad: 0, riesgos: {} };
      g.cantidad += 1;
      const r = c.riesgo ?? "—";
      g.riesgos[r] = (g.riesgos[r] ?? 0) + 1;
      gTipo.set(t, g);
    }
  } else if (agrupar === "riesgo") {
    for (const c of lista) {
      const r = c.riesgo ?? "—";
      const g = gRiesgo.get(r) ?? { riesgo: r, cantidad: 0 };
      g.cantidad += 1;
      gRiesgo.set(r, g);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Comercial y Clientes</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Clientes
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Catálogo, segmentación y riesgo de cobro.
          </p>
        </div>
        {puedeGestionar && (
          <Link href="/clientes/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Activos"
          value={cActivos ?? 0}
          sub="Clientes activos"
          accent="brand"
        />
        <KpiCard
          label="Comerciales"
          value={cComerciales ?? 0}
          sub="Tipo comercial"
        />
        <KpiCard
          label="Industriales"
          value={cIndustriales ?? 0}
          sub="Tipo industrial"
        />
        <KpiCard
          label="Riesgo alto"
          value={cRiesgoAlto ?? 0}
          sub="Atender cobro"
          accent={cRiesgoAlto && cRiesgoAlto > 0 ? "danger" : "ok"}
        />
      </div>

      <div className="mb-6">
        <ClientesToolbar
          current={{
            q,
            tipo,
            riesgo,
            activo,
            score_min: scoreMinRaw,
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

      {lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          {q || tipo || riesgo
            ? "Sin resultados con los filtros."
            : "Sin clientes."}
        </div>
      ) : agrupar === "tipo" ? (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Tipo</TableHead>
                <TableHead align="right">Cantidad</TableHead>
                <TableHead align="right">Riesgo bajo</TableHead>
                <TableHead align="right">Riesgo medio</TableHead>
                <TableHead align="right">Riesgo alto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(gTipo.values())
                .sort((a, b) => b.cantidad - a.cantidad)
                .map((g) => (
                  <TableRow key={g.tipo}>
                    <TableCell className="font-medium capitalize">
                      <Link
                        href={`/clientes?tipo=${g.tipo}`}
                        className="hover:text-brand"
                      >
                        {g.tipo}
                      </Link>
                    </TableCell>
                    <TableCell align="right" mono>
                      {g.cantidad}
                    </TableCell>
                    <TableCell align="right" mono className="text-emerald-700">
                      {g.riesgos.bajo ?? 0}
                    </TableCell>
                    <TableCell align="right" mono className="text-amber-700">
                      {g.riesgos.medio ?? 0}
                    </TableCell>
                    <TableCell align="right" mono className="text-red-700">
                      {g.riesgos.alto ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableSurface>
      ) : agrupar === "riesgo" ? (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Riesgo</TableHead>
                <TableHead align="right">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(gRiesgo.values())
                .sort((a, b) => b.cantidad - a.cantidad)
                .map((g) => (
                  <TableRow key={g.riesgo}>
                    <TableCell>
                      <Link
                        href={`/clientes?riesgo=${g.riesgo}`}
                        className="inline-flex items-center gap-2 font-medium capitalize hover:text-brand"
                      >
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${riesgoColor[g.riesgo] ?? "bg-muted"}`}
                        />
                        {g.riesgo}
                      </Link>
                    </TableCell>
                    <TableCell align="right" mono>
                      {g.cantidad}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableSurface>
      ) : (
        <>
          <TableSurface>
            <Table>
              <TableHeader>
                <TableRow interactive={false}>
                  <TableHead>Cliente</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead align="right">Score pago</TableHead>
                  <TableHead align="center">Estado</TableHead>
                  <TableHead>Alta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow
                    key={c.id}
                    className={!c.activo ? "opacity-60" : undefined}
                  >
                    <TableCell>
                      <Link
                        href={`/clientes/${c.id}`}
                        className="font-medium hover:text-brand"
                      >
                        {c.razon_social}
                      </Link>
                      {c.nombre_comercial && (
                        <p className="text-[11px] text-ink-3">
                          {c.nombre_comercial}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.rfc}</TableCell>
                    <TableCell className="text-xs capitalize">
                      {c.tipo ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${riesgoBadge[c.riesgo ?? ""] ?? "bg-bg-2"}`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${riesgoColor[c.riesgo ?? ""] ?? "bg-muted"}`}
                        />
                        <span className="capitalize">{c.riesgo ?? "—"}</span>
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      {c.score_pago !== null && c.score_pago !== undefined ? (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 font-mono text-[11px] tnum ${scoreBadgeClass(c.score_pago)}`}
                        >
                          {c.score_pago}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-4">—</span>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {c.activo ? (
                        <span className="text-[11px] text-ok-deep">Activo</span>
                      ) : (
                        <span className="text-[11px] text-ink-3">Inactivo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-ink-3">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
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
    return `/clientes?${params.toString()}`;
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
