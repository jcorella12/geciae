import Link from "next/link";
import { redirect } from "next/navigation";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ETIQUETA_TIPO: Record<string, string> = {
  FP: "Formato de Proceso",
  FO: "Formato Operativo",
  MA: "Manual",
  PO: "Procedimiento Operativo",
};

const COLOR_TIPO: Record<string, string> = {
  FP: "bg-blue-100 text-blue-700",
  FO: "bg-emerald-100 text-emerald-700",
  MA: "bg-violet-100 text-violet-700",
  PO: "bg-amber-100 text-amber-700",
};

export default async function SgcPage({
  searchParams,
}: {
  searchParams?: { tipo?: string; area?: string };
}) {
  const vinculos = await obtenerVinculos();
  if (
    !esCEO(vinculos) &&
    !tieneAtributo(vinculos, "coordinador_calidad") &&
    !tieneAtributo(vinculos, "auditor_interno")
  ) {
    redirect("/mi-dia");
  }

  const supabase = createClient();

  let q = supabase
    .from("sgc_documentos")
    .select(
      "id, tipo, codigo, nombre, descripcion, area, vigente, fecha_aprobacion",
    )
    .order("tipo")
    .order("codigo");
  if (searchParams?.tipo)
    q = q.eq("tipo", searchParams.tipo as never);
  if (searchParams?.area) q = q.eq("area", searchParams.area);
  const { data: docs } = await q;

  // Última revisión por documento
  const docIds = (docs ?? []).map((d) => d.id);
  const { data: revisiones } = docIds.length
    ? await supabase
        .from("sgc_documento_revisiones")
        .select("documento_id, revision, fecha")
        .in("documento_id", docIds)
        .order("revision", { ascending: false })
    : { data: [] as Array<{ documento_id: string; revision: number; fecha: string }> };

  const ultimaRevPorDoc = new Map<string, { revision: number; fecha: string }>();
  for (const r of revisiones ?? []) {
    if (!ultimaRevPorDoc.has(r.documento_id))
      ultimaRevPorDoc.set(r.documento_id, {
        revision: r.revision,
        fecha: r.fecha,
      });
  }

  // Áreas únicas para filtro
  const areas = Array.from(
    new Set((docs ?? []).map((d) => d.area).filter((a): a is string => Boolean(a))),
  );

  const total = (docs ?? []).length;
  const vigentes = (docs ?? []).filter((d) => d.vigente).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">
      <div>
        <Link
          href="/configuracion"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Configuración
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Sistema de Gestión de Calidad (SGC)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Codificación FP/FO/MA/PO. Cada documento puede tener múltiples
          revisiones (cambios versionados). Solo CEO o coordinador de calidad
          pueden modificar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total documentos" value={String(total)} />
        <Stat label="Vigentes" value={String(vigentes)} tone="ok" />
        <Stat label="Áreas" value={String(areas.length)} />
        <Stat
          label="Revisiones registradas"
          value={String(revisiones?.length ?? 0)}
        />
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="tipo" className="text-xs font-medium">
            Tipo
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={searchParams?.tipo ?? ""}
            className="flex h-9 w-32 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todos</option>
            {(["FP", "FO", "MA", "PO"] as const).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="area" className="text-xs font-medium">
            Área
          </label>
          <select
            id="area"
            name="area"
            defaultValue={searchParams?.area ?? ""}
            className="flex h-9 w-44 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Filtrar
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-base font-semibold">
          Documentos ({(docs ?? []).length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Área</th>
                <th className="px-4 py-2 font-medium">Última revisión</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(docs ?? []).map((d) => {
                const ultima = ultimaRevPorDoc.get(d.id);
                return (
                  <tr key={d.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${COLOR_TIPO[d.tipo as string] ?? ""}`}
                        title={ETIQUETA_TIPO[d.tipo as string]}
                      >
                        {d.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{d.codigo}</td>
                    <td className="px-4 py-2">{d.nombre}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {d.area ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {ultima ? (
                        <span>
                          Rev. {ultima.revision} · {ultima.fecha}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Sin revisiones
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {d.vigente ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          Vigente
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          Obsoleto
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(docs ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Sin documentos SGC. La migración 5.6 detallado incluyó un
                    seed mínimo (FP-001/002/003, FO-001/002/003, MA-001,
                    PO-001).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Tip: vincula documentos SGC con etapas de plantillas vía la tabla
        plantilla_etapas_sgc para que cada paso del flujo PSE Solar tenga su
        formato/procedimiento de referencia.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "bad";
}) {
  const cl =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-rose-700"
        : "";
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-mono text-lg font-semibold tabular-nums ${cl}`}>
        {value}
      </p>
    </div>
  );
}
