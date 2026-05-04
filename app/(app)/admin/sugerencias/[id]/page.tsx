import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  COLOR_CATEGORIA,
  ETIQUETA_CATEGORIA,
  type CategoriaSugerencia,
  type EstadoSugerencia,
} from "@/lib/sugerencias/state";

import { SugerenciaTriageForm } from "./triage-form";

export const dynamic = "force-dynamic";

const fmtFechaHora = (d: string) =>
  new Date(d).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function SugerenciaDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const v = await obtenerVinculos();
  if (!esCEO(v)) redirect("/mi-dia");

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: s } = await (supabase as any)
    .from("sugerencias_mejora")
    .select(
      "id, usuario_id, empresa_contexto, categoria, descripcion, url_contexto, user_agent, estado, prioridad, notas_internas, asignado_a, created_at, updated_at",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!s) notFound();

  const sug = s as {
    id: string;
    usuario_id: string;
    empresa_contexto: string | null;
    categoria: CategoriaSugerencia;
    descripcion: string;
    url_contexto: string | null;
    user_agent: string | null;
    estado: EstadoSugerencia;
    prioridad: number | null;
    notas_internas: string | null;
    asignado_a: string | null;
    created_at: string;
    updated_at: string;
  };

  // Resolver nombre del autor + asignado
  const userIds = [sug.usuario_id, sug.asignado_a].filter(
    (i): i is string => Boolean(i),
  );
  const nombres: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: emps } = await supabase
      .from("empleados")
      .select("usuario_id, nombre_completo")
      .in("usuario_id", userIds);
    for (const e of emps ?? []) {
      if (e.usuario_id)
        nombres[e.usuario_id] = e.nombre_completo as string;
    }
  }

  // Candidatos para asignar (todos los empleados con cuenta de auth)
  const { data: candidatosRaw } = await supabase
    .from("empleados")
    .select("usuario_id, nombre_completo, puesto")
    .not("usuario_id", "is", null)
    .eq("activo", true)
    .order("nombre_completo");
  const candidatos = (candidatosRaw ?? []).filter(
    (c): c is typeof c & { usuario_id: string } => c.usuario_id !== null,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-7">
      <div className="mb-6">
        <Link
          href="/admin/sugerencias"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Sugerencias
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_CATEGORIA[sug.categoria]}`}
              >
                {ETIQUETA_CATEGORIA[sug.categoria]}
              </span>
              <code className="font-mono text-[10.5px] text-ink-3">
                {sug.id.slice(0, 8)}
              </code>
            </div>
            <h1 className="mt-2 text-[20px] font-semibold leading-tight">
              Sugerencia de {nombres[sug.usuario_id] ?? "usuario"}
            </h1>
            <p className="mt-0.5 text-[12px] text-ink-3">
              {fmtFechaHora(sug.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Descripción */}
      <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[13.5px] font-semibold">Descripción</h2>
        <p className="mt-2 whitespace-pre-wrap text-[13px]">
          {sug.descripcion}
        </p>
      </section>

      {/* Contexto técnico */}
      <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[13.5px] font-semibold">Contexto</h2>
        <dl className="mt-2 space-y-1 text-[12px]">
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 text-ink-3">URL</dt>
            <dd className="font-mono">
              {sug.url_contexto ? (
                <a
                  href={sug.url_contexto}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  {sug.url_contexto.replace(/^https?:\/\/[^/]+/, "")}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 text-ink-3">User agent</dt>
            <dd className="font-mono text-[10.5px] text-ink-2">
              {sug.user_agent ?? "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 text-ink-3">Última acción</dt>
            <dd>{fmtFechaHora(sug.updated_at)}</dd>
          </div>
        </dl>
      </section>

      {/* Triage */}
      <SugerenciaTriageForm
        sugerenciaId={sug.id}
        estadoActual={sug.estado}
        prioridadActual={sug.prioridad ?? 0}
        notasActuales={sug.notas_internas ?? ""}
        asignadoActual={sug.asignado_a}
        candidatos={candidatos.map((c) => ({
          user_id: c.usuario_id,
          nombre: c.nombre_completo,
          puesto: c.puesto,
        }))}
      />
    </div>
  );
}
