import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusDot } from "@/components/ui/status-dot";
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
  puedeGestionarProveedores,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { EstadoTabs } from "@/components/shared/estado-tabs";
import { Lista69bBanner } from "@/components/shared/lista-69b-banner";

import { ProveedoresToolbar } from "./proveedores-toolbar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const semaforoColor: Record<string, string> = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-500",
  rojo: "bg-red-500",
  negro: "bg-gray-800",
};

const semaforoBadge: Record<string, string> = {
  verde: "bg-emerald-100 text-emerald-700",
  amarillo: "bg-amber-100 text-amber-700",
  rojo: "bg-red-100 text-red-700",
  negro: "bg-gray-200 text-gray-700",
};

type SearchParams = {
  q?: string;
  tipo?: string;
  semaforo?: string;
  activo?: string;
  /** Estado de archivado: activo (default), inactivo, archivado o "todos" (omitido). */
  estado?: "activo" | "inactivo" | "archivado" | "todos";
  repse?: string;
  aprobado?: string;
  agrupar?: string;
  page?: string;
};

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeGestionar = puedeGestionarProveedores(vinculos);

  const sp = searchParams ?? {};
  const q = (sp.q ?? "").trim();
  const tipo = sp.tipo ?? "";
  const semaforo = sp.semaforo ?? "";
  const activo = sp.activo ?? "";
  // Default: tab "Activos" (estado='activo'). El tab "Todos" omite el param.
  const estadoTab = sp.estado ?? "activo";
  const repse = sp.repse ?? "";
  const aprobado = sp.aprobado ?? "";
  const agrupar = sp.agrupar ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  let query = supabase
    .from("proveedores")
    .select(
      "id, razon_social, nombre_comercial, rfc, regimen_fiscal, tipo_proveedor, clasificacion_interna, semaforo, esta_aprobado, requiere_repse, activo",
      { count: "exact" },
    )
    .order("razon_social", { ascending: true });

  if (activo === "true") query = query.eq("activo", true);
  if (activo === "false") query = query.eq("activo", false);
  // Filtro por estado de archivado (sprint 1.5)
  if (estadoTab === "activo") query = query.eq("estado" as never, "activo");
  else if (estadoTab === "inactivo") query = query.eq("estado" as never, "inactivo");
  else if (estadoTab === "archivado") query = query.eq("estado" as never, "archivado");
  // estadoTab === "todos" → no filtro
  if (tipo) query = query.eq("tipo_proveedor", tipo);
  if (semaforo) query = query.eq("semaforo", semaforo);
  if (repse === "true") query = query.eq("requiere_repse", true);
  if (repse === "false") query = query.eq("requiere_repse", false);
  if (aprobado === "true") query = query.eq("esta_aprobado", true);
  if (aprobado === "false") query = query.eq("esta_aprobado", false);
  if (q) {
    query = query.or(
      `razon_social.ilike.%${q}%,nombre_comercial.ilike.%${q}%,rfc.ilike.%${q}%`,
    );
  }

  const paged = agrupar
    ? query.range(0, 4999)
    : query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: proveedores, count, error } = await paged;
  const lista = proveedores ?? [];

  const [
    { count: cVerde },
    { count: cAmarillo },
    { count: cRojo },
    { count: cRepse },
  ] = await Promise.all([
    supabase
      .from("proveedores")
      .select("id", { count: "exact", head: true })
      .eq("semaforo", "verde")
      .eq("activo", true),
    supabase
      .from("proveedores")
      .select("id", { count: "exact", head: true })
      .eq("semaforo", "amarillo")
      .eq("activo", true),
    supabase
      .from("proveedores")
      .select("id", { count: "exact", head: true })
      .in("semaforo", ["rojo", "negro"])
      .eq("activo", true),
    supabase
      .from("proveedores")
      .select("id", { count: "exact", head: true })
      .eq("requiere_repse", true)
      .eq("activo", true),
  ]);

  const totalPaginas = count ? Math.ceil(count / PAGE_SIZE) : 1;
  type GTipo = {
    tipo: string;
    cantidad: number;
    semaforos: Record<string, number>;
  };
  type GSem = { semaforo: string; cantidad: number };
  const gTipo = new Map<string, GTipo>();
  const gSem = new Map<string, GSem>();
  if (agrupar === "tipo") {
    for (const p of lista) {
      const t = p.tipo_proveedor ?? "—";
      const g = gTipo.get(t) ?? { tipo: t, cantidad: 0, semaforos: {} };
      g.cantidad += 1;
      const s = p.semaforo ?? "—";
      g.semaforos[s] = (g.semaforos[s] ?? 0) + 1;
      gTipo.set(t, g);
    }
  } else if (agrupar === "semaforo") {
    for (const p of lista) {
      const s = p.semaforo ?? "—";
      const g = gSem.get(s) ?? { semaforo: s, cantidad: 0 };
      g.cantidad += 1;
      gSem.set(s, g);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <Lista69bBanner />
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Administración y Finanzas</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Proveedores
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Catálogo, semáforo de cumplimiento y vínculo con OC.
          </p>
        </div>
        {puedeGestionar && (
          <Link href="/finanzas/proveedores/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo proveedor
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Verde"
          value={cVerde ?? 0}
          sub="Cumplimiento OK"
          accent="ok"
        />
        <KpiCard
          label="Amarillo"
          value={cAmarillo ?? 0}
          sub="Atender"
          accent="warn"
        />
        <KpiCard
          label="Rojo / Negro"
          value={cRojo ?? 0}
          sub="Bloqueados"
          accent={cRojo && cRojo > 0 ? "danger" : "brand"}
        />
        <KpiCard
          label="REPSE"
          value={cRepse ?? 0}
          sub="Subcontratistas activos"
        />
      </div>

      <EstadoTabs current={estadoTab} basePath="/finanzas/proveedores" />

      <div className="mb-6">
        <ProveedoresToolbar
          current={{ q, tipo, semaforo, activo, repse, aprobado, agrupar }}
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
          {q || tipo || semaforo
            ? "Sin resultados con los filtros."
            : "Sin proveedores."}
        </div>
      ) : agrupar === "tipo" ? (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Tipo</TableHead>
                <TableHead align="right">Cantidad</TableHead>
                <TableHead align="right">Verde</TableHead>
                <TableHead align="right">Amarillo</TableHead>
                <TableHead align="right">Rojo / Negro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(gTipo.values())
                .sort((a, b) => b.cantidad - a.cantidad)
                .map((g) => (
                  <TableRow key={g.tipo}>
                    <TableCell className="font-medium capitalize">
                      <Link
                        href={`/finanzas/proveedores?tipo=${g.tipo}`}
                        className="hover:text-brand"
                      >
                        {g.tipo}
                      </Link>
                    </TableCell>
                    <TableCell align="right" mono>
                      {g.cantidad}
                    </TableCell>
                    <TableCell align="right" mono className="text-emerald-700">
                      {g.semaforos.verde ?? 0}
                    </TableCell>
                    <TableCell align="right" mono className="text-amber-700">
                      {g.semaforos.amarillo ?? 0}
                    </TableCell>
                    <TableCell align="right" mono className="text-red-700">
                      {(g.semaforos.rojo ?? 0) + (g.semaforos.negro ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableSurface>
      ) : agrupar === "semaforo" ? (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Semáforo</TableHead>
                <TableHead align="right">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(gSem.values())
                .sort((a, b) => b.cantidad - a.cantidad)
                .map((g) => (
                  <TableRow key={g.semaforo}>
                    <TableCell>
                      <Link
                        href={`/finanzas/proveedores?semaforo=${g.semaforo}`}
                        className="inline-flex items-center gap-2 font-medium capitalize hover:text-brand"
                      >
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${semaforoColor[g.semaforo] ?? "bg-muted"}`}
                        />
                        {g.semaforo}
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
                  <TableHead>Proveedor</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Clasificación</TableHead>
                  <TableHead>Semáforo</TableHead>
                  <TableHead align="center">Aprobado</TableHead>
                  <TableHead align="center">REPSE</TableHead>
                  <TableHead align="center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((p) => (
                  <TableRow
                    key={p.id}
                    href={`/finanzas/proveedores/${p.id}`}
                    linkLabel={`Abrir proveedor ${p.razon_social}`}
                    className={!p.activo ? "opacity-60" : undefined}
                  >
                    <TableCell>
                      <p className="font-medium">{p.razon_social}</p>
                      {p.nombre_comercial && (
                        <p className="text-[11px] text-ink-3">
                          {p.nombre_comercial}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.rfc}</TableCell>
                    <TableCell className="text-xs capitalize">
                      {p.tipo_proveedor ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      {p.clasificacion_interna ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${semaforoBadge[p.semaforo ?? "verde"] ?? "bg-bg-2"}`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${semaforoColor[p.semaforo ?? "verde"] ?? "bg-muted"}`}
                        />
                        <span className="capitalize">{p.semaforo ?? "—"}</span>
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      {p.esta_aprobado ? (
                        <StatusDot status="ok" />
                      ) : (
                        <StatusDot status="idle" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {p.requiere_repse ? (
                        <span className="text-[11px] font-medium text-purple-700">
                          Sí
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-4">—</span>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {p.activo ? (
                        <span className="text-[11px] text-ok-deep">Activo</span>
                      ) : (
                        <span className="text-[11px] text-ink-3">Inactivo</span>
                      )}
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
    return `/finanzas/proveedores?${params.toString()}`;
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
