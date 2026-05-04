import { Activity, BarChart3 } from "lucide-react";
import { redirect } from "next/navigation";

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
import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = {
  dias?: string;
};

export default async function AdminUsoPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const v = await obtenerVinculos();
  if (!esCEO(v)) redirect("/mi-dia");

  const dias = searchParams?.dias
    ? Math.max(1, Math.min(180, parseInt(searchParams.dias, 10)))
    : 30;
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
    .toISOString();

  const supabase = createClient();

  // Top páginas (vía RPC)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: topPaginas } = await (supabase as any).rpc(
    "top_paginas_uso",
    { p_dias: dias },
  );

  // Eventos del periodo (para KPIs y top usuarios)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventos } = await (supabase as any)
    .from("eventos_uso")
    .select("usuario_id, tipo, created_at, pagina")
    .gte("created_at", desde)
    .limit(10000);

  type Evento = {
    usuario_id: string;
    tipo: string;
    created_at: string;
    pagina: string | null;
  };
  const lista: Evento[] = (eventos ?? []) as Evento[];

  const totalEventos = lista.length;
  const totalPageviews = lista.filter((e) => e.tipo === "pageview").length;
  const usuariosActivos = new Set(lista.map((e) => e.usuario_id)).size;
  const errores = lista.filter((e) => e.tipo === "error_user").length;

  // Top usuarios por # eventos
  const cuentaPorUsuario = new Map<string, number>();
  for (const e of lista) {
    cuentaPorUsuario.set(
      e.usuario_id,
      (cuentaPorUsuario.get(e.usuario_id) ?? 0) + 1,
    );
  }
  const topUsuariosIds = Array.from(cuentaPorUsuario.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Resolver nombres
  const nombres: Record<string, string> = {};
  if (topUsuariosIds.length > 0) {
    const { data: emps } = await supabase
      .from("empleados")
      .select("usuario_id, nombre_completo")
      .in(
        "usuario_id",
        topUsuariosIds.map(([id]) => id),
      );
    for (const e of emps ?? []) {
      if (e.usuario_id)
        nombres[e.usuario_id] = e.nombre_completo as string;
    }
  }

  // Distribución por hora (24 buckets)
  const horas = new Array<number>(24).fill(0);
  for (const e of lista) {
    if (e.tipo !== "pageview") continue;
    const h = new Date(e.created_at).getHours();
    horas[h]++;
  }
  const maxHora = Math.max(...horas, 1);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 py-7">
      <div className="mb-6">
        <p className="lbl-mini">Administración</p>
        <h1 className="mt-1.5 flex items-center gap-2 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          <Activity className="h-6 w-6 text-violet-700" />
          Métricas de uso
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Telemetría interna ligera. Sin PII, solo agregados de uso.
        </p>
      </div>

      {/* Filtro dias */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 shadow-xs">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Período
        </span>
        {[7, 30, 90].map((d) => (
          <a
            key={d}
            href={`/admin/uso?dias=${d}`}
            className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${
              dias === d
                ? "bg-brand text-brand-fg"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3"
            }`}
          >
            {d} días
          </a>
        ))}
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pageviews" value={totalPageviews.toLocaleString("es-MX")} />
        <KpiCard
          label="Usuarios activos"
          value={String(usuariosActivos)}
          sub="Distintos en el período"
        />
        <KpiCard
          label="Eventos totales"
          value={totalEventos.toLocaleString("es-MX")}
        />
        <KpiCard
          label="Errores reportados"
          value={String(errores)}
          accent={errores > 0 ? "warn" : "ok"}
        />
      </div>

      {totalEventos === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Aún no hay eventos registrados en este período. La telemetría
          empieza a llenar la tabla cuando los usuarios navegan después de
          aplicar la migración.
        </p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            {/* Top páginas */}
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-[13.5px] font-semibold">
                <BarChart3 className="h-4 w-4 text-brand" />
                Páginas más visitadas
              </h2>
              <TableSurface>
                <Table>
                  <TableHeader>
                    <TableRow interactive={false}>
                      <TableHead>Página</TableHead>
                      <TableHead align="right">Visitas</TableHead>
                      <TableHead align="right">Únicos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(topPaginas ?? []).slice(0, 15).map(
                      (
                        p: {
                          pagina: string;
                          visitas: number;
                          usuarios_unicos: number;
                        },
                      ) => (
                        <TableRow
                          key={p.pagina}
                          interactive={false}
                          className="text-[12px]"
                        >
                          <TableCell className="truncate font-mono">
                            {p.pagina}
                          </TableCell>
                          <TableCell align="right" mono>
                            {Number(p.visitas).toLocaleString("es-MX")}
                          </TableCell>
                          <TableCell align="right" mono>
                            {Number(p.usuarios_unicos)}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </TableSurface>
            </section>

            {/* Top usuarios */}
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-3 text-[13.5px] font-semibold">
                Usuarios más activos
              </h2>
              <TableSurface>
                <Table>
                  <TableHeader>
                    <TableRow interactive={false}>
                      <TableHead>Usuario</TableHead>
                      <TableHead align="right">Eventos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topUsuariosIds.map(([userId, count]) => (
                      <TableRow
                        key={userId}
                        interactive={false}
                        className="text-[12px]"
                      >
                        <TableCell>
                          {nombres[userId] ?? userId.slice(0, 8)}
                        </TableCell>
                        <TableCell align="right" mono>
                          {count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableSurface>
            </section>
          </div>

          {/* Distribución por hora */}
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-[13.5px] font-semibold">
              Distribución por hora del día
            </h2>
            <div
              className="grid gap-px"
              style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
            >
              {horas.map((c, h) => (
                <div
                  key={h}
                  className="flex flex-col items-center justify-end"
                  title={`${h.toString().padStart(2, "0")}:00 — ${c} pageviews`}
                >
                  <div
                    className="w-full bg-brand"
                    style={{ height: `${(c / maxHora) * 80}px` }}
                  />
                  <span className="mt-1 font-mono text-[9px] text-ink-3">
                    {h.toString().padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] text-ink-3">
              Pageviews por hora · escala relativa al pico (
              {maxHora.toLocaleString("es-MX")}).
            </p>
          </section>
        </>
      )}

      <details className="mt-6 rounded-md border border-border bg-card p-3 text-[11.5px] text-ink-3">
        <summary className="cursor-pointer font-medium text-ink-1">
          Privacidad y mantenimiento
        </summary>
        <ul className="mt-2 space-y-1 pl-4 list-disc">
          <li>
            Los eventos guardan solo: usuario_id, tipo, ruta sin query
            params, timestamp.
          </li>
          <li>
            No se almacena contenido de formularios, RFCs, montos ni
            cualquier dato sensible.
          </li>
          <li>
            La tabla está protegida por RLS: solo el CEO puede leerla.
          </li>
          <li>
            Para limpiar registros antiguos: ejecutar
            <code className="mx-1 font-mono">
              SELECT limpiar_eventos_uso_antiguos(90);
            </code>
            en el SQL editor de Supabase (CEO only).
          </li>
        </ul>
      </details>
    </div>
  );
}
