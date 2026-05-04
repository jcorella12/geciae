import { Lightbulb } from "lucide-react";
import Link from "next/link";
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
import {
  COLOR_CATEGORIA,
  COLOR_ESTADO,
  ETIQUETA_CATEGORIA,
  ETIQUETA_ESTADO,
  type CategoriaSugerencia,
  type EstadoSugerencia,
} from "@/lib/sugerencias/state";

export const dynamic = "force-dynamic";

const fmtFechaHora = (d: string) =>
  new Date(d).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

type Sugerencia = {
  id: string;
  usuario_id: string;
  empresa_contexto: string | null;
  categoria: CategoriaSugerencia;
  descripcion: string;
  url_contexto: string | null;
  estado: EstadoSugerencia;
  prioridad: number | null;
  asignado_a: string | null;
  created_at: string;
};

type SearchParams = {
  estado?: EstadoSugerencia | "todos";
  categoria?: CategoriaSugerencia | "todos";
};

export default async function AdminSugerenciasPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const v = await obtenerVinculos();
  if (!esCEO(v)) redirect("/mi-dia");

  const supabase = createClient();

  const estadoF = searchParams?.estado ?? "todos";
  const catF = searchParams?.categoria ?? "todos";

  let query = supabase
    .from("sugerencias_mejora")
    .select(
      "id, usuario_id, empresa_contexto, categoria, descripcion, url_contexto, estado, prioridad, asignado_a, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (estadoF !== "todos") query = query.eq("estado", estadoF);
  if (catF !== "todos") query = query.eq("categoria", catF);

  const { data: rows } = (await query) as { data: Sugerencia[] | null };
  const lista: Sugerencia[] = rows ?? [];

  // KPIs
  const total = lista.length;
  const nuevas = lista.filter((s) => s.estado === "nueva").length;
  const revisadas = lista.filter((s) =>
    ["en_revision", "planeada"].includes(s.estado),
  ).length;
  const implementadas = lista.filter(
    (s) => s.estado === "implementada",
  ).length;

  // Resolver nombres de usuario
  const userIds = Array.from(new Set(lista.map((s) => s.usuario_id)));
  const nombresPorUserId: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: emps } = await supabase
      .from("empleados")
      .select("usuario_id, nombre_completo")
      .in("usuario_id", userIds);
    for (const e of emps ?? []) {
      if (e.usuario_id)
        nombresPorUserId[e.usuario_id] = e.nombre_completo as string;
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6">
        <p className="lbl-mini">Administración</p>
        <h1 className="mt-1.5 flex items-center gap-2 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          <Lightbulb className="h-6 w-6 text-amber-600" />
          Sugerencias de mejora
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Feedback continuo del equipo. Categorización y triage manual.
        </p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total recibidas" value={String(total)} />
        <KpiCard
          label="Nuevas"
          value={String(nuevas)}
          accent={nuevas > 0 ? "warn" : "ok"}
          sub="Esperan triage"
        />
        <KpiCard
          label="En proceso"
          value={String(revisadas)}
          sub="Revisión / planeadas"
        />
        <KpiCard
          label="Implementadas"
          value={String(implementadas)}
          accent="ok"
        />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 shadow-xs">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Estado
        </span>
        {(["todos", "nueva", "en_revision", "planeada", "implementada", "descartada"] as const).map(
          (e) => (
            <Link
              key={e}
              href={`/admin/sugerencias?${new URLSearchParams({
                ...(e !== "todos" ? { estado: e } : {}),
                ...(catF !== "todos" ? { categoria: catF } : {}),
              }).toString()}`}
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                estadoF === e
                  ? "bg-brand text-brand-fg"
                  : "bg-bg-2 text-ink-2 hover:bg-bg-3"
              }`}
            >
              {e === "todos"
                ? "Todos"
                : ETIQUETA_ESTADO[e as EstadoSugerencia]}
            </Link>
          ),
        )}
        <span className="ml-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Categoría
        </span>
        {(["todos", "bug", "mejora_ux", "feature_nuevo", "rendimiento", "otro"] as const).map(
          (c) => (
            <Link
              key={c}
              href={`/admin/sugerencias?${new URLSearchParams({
                ...(estadoF !== "todos" ? { estado: estadoF } : {}),
                ...(c !== "todos" ? { categoria: c } : {}),
              }).toString()}`}
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                catF === c
                  ? "bg-brand text-brand-fg"
                  : "bg-bg-2 text-ink-2 hover:bg-bg-3"
              }`}
            >
              {c === "todos"
                ? "Todas"
                : ETIQUETA_CATEGORIA[c as CategoriaSugerencia]}
            </Link>
          ),
        )}
      </div>

      {lista.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-ink-3">
          Sin sugerencias con los filtros seleccionados.
        </p>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Sugerencia</TableHead>
                <TableHead>Contexto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead align="right">Prioridad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((s) => (
                <TableRow
                  key={s.id}
                  href={`/admin/sugerencias/${s.id}`}
                  linkLabel={`Abrir sugerencia ${s.id.slice(0, 8)}`}
                >
                  <TableCell className="text-[11.5px] text-ink-3">
                    {fmtFechaHora(s.created_at)}
                  </TableCell>
                  <TableCell className="text-[12px]">
                    {nombresPorUserId[s.usuario_id] ??
                      s.usuario_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_CATEGORIA[s.categoria]}`}
                    >
                      {ETIQUETA_CATEGORIA[s.categoria]}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2 text-[12px]">
                      {s.descripcion}
                    </p>
                  </TableCell>
                  <TableCell className="font-mono text-[10.5px] text-ink-3">
                    {s.url_contexto ? (
                      <span className="truncate">
                        {s.url_contexto.replace(/^https?:\/\/[^/]+/, "")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_ESTADO[s.estado]}`}
                    >
                      {ETIQUETA_ESTADO[s.estado]}
                    </span>
                  </TableCell>
                  <TableCell align="right" mono className="text-[12px]">
                    {s.prioridad ?? 0}
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
