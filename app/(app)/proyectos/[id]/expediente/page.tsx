import Link from "next/link";
import { notFound } from "next/navigation";

import {
  obtenerVinculos,
  puedeGestionarProyectosEn,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { DocExpedienteRow } from "./doc-form";

export const dynamic = "force-dynamic";

export default async function ExpedientePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();

  const { data: p } = await supabase
    .from("proyectos")
    .select("id, codigo, nombre, empresa_id, estado, plantilla_tipo")
    .eq("id", params.id)
    .maybeSingle();
  if (!p) notFound();

  const puedeEditar = puedeGestionarProyectosEn(vinculos, p.empresa_id);

  const { data: docs } = await supabase
    .from("proyecto_expediente")
    .select(
      "id, codigo_documento, nombre, obligatorio, requerido_para_estado, estado, url_archivo, fecha_recibido, observaciones",
    )
    .eq("proyecto_id", params.id)
    .order("requerido_para_estado", { nullsFirst: false })
    .order("codigo_documento");

  const lista = docs ?? [];
  const aprobados = lista.filter((d) => d.estado === "aprobado").length;
  const pendientes = lista.filter(
    (d) => d.obligatorio && d.estado !== "aprobado" && d.estado !== "no_aplica",
  ).length;
  const total = lista.length;
  const completitud = total > 0 ? Math.round((aprobados / total) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">
      <div>
        <Link
          href={`/proyectos/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al proyecto
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Expediente — {p.nombre}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{p.codigo}</span>
          {p.plantilla_tipo && (
            <>
              {" · "}
              Plantilla: <span className="font-mono">{p.plantilla_tipo}</span>
            </>
          )}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={String(total)} />
        <Stat label="Aprobados" value={String(aprobados)} tone="ok" />
        <Stat
          label="Pendientes obligatorios"
          value={String(pendientes)}
          tone={pendientes > 0 ? "bad" : "ok"}
        />
        <Stat label="Completitud" value={`${completitud}%`} />
      </div>

      {pendientes > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          ⚠ Hay {pendientes} documento{pendientes === 1 ? "" : "s"} obligatorio
          {pendientes === 1 ? "" : "s"} pendiente
          {pendientes === 1 ? "" : "s"}. El cambio de estado del proyecto
          quedará bloqueado hasta que estén aprobados o marcados como N/A.
        </div>
      )}

      {/* Tabla */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Documentos requeridos ({total})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Documento</th>
                <th className="px-4 py-2 font-medium">Requerido para</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Archivo</th>
                <th className="px-4 py-2 font-medium">Recibido</th>
                <th className="px-4 py-2 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((d) => (
                <DocExpedienteRow
                  key={d.id}
                  doc={d}
                  puedeEditar={puedeEditar}
                />
              ))}
              {lista.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {p.plantilla_tipo
                      ? "Sin documentos. ¿La plantilla tiene plantilla_documentos definidos?"
                      : "Este proyecto no tiene plantilla asignada. Edita el proyecto para asignar una y se generarán automáticamente los documentos requeridos."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
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
