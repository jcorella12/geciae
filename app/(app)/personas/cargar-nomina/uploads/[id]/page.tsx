import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Error = { archivo: string; error: string; curp?: string | null };

export default async function UploadDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: u } = await supabase
    .from("nomina_uploads")
    .select(
      "id, empresa_id, archivo_original_nombre, total_archivos, archivos_procesados, archivos_fallidos, empleados_nuevos_detectados, empleados_nuevos_creados, total_neto_pagado, errores, curps_nuevas, estado, observaciones, created_at, procesado_at, empresas(codigo, nombre_comercial)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!u) notFound();

  const errores = (u.errores ?? []) as unknown as Error[];
  const curpsNuevas = (u.curps_nuevas ?? []) as unknown as string[];
  const empresa = u.empresas as
    | { codigo: string; nombre_comercial: string | null }
    | null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-6">
      <div>
        <Link
          href="/personas/cargar-nomina"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Cargar nómina
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Upload {params.id.slice(0, 8)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {empresa?.codigo} ·{" "}
          {u.created_at
            ? new Date(u.created_at).toLocaleString("es-MX", {
                dateStyle: "long",
                timeStyle: "short",
              })
            : "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Archivos" value={String(u.total_archivos)} />
        <Stat
          label="Procesados"
          value={String(u.archivos_procesados)}
          tone="ok"
        />
        <Stat
          label="Fallidos"
          value={String(u.archivos_fallidos ?? 0)}
          tone={(u.archivos_fallidos ?? 0) > 0 ? "bad" : "ok"}
        />
        <Stat
          label="Neto pagado"
          value={`$${Number(u.total_neto_pagado ?? 0).toLocaleString(
            "es-MX",
            { minimumFractionDigits: 0 },
          )}`}
        />
      </div>

      {curpsNuevas.length > 0 && (
        <section className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Empleados nuevos detectados ({curpsNuevas.length})
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Estos CURPs no existen en empleados. Crea cada empleado en{" "}
            <Link href="/personas/nuevo" className="underline">
              /personas/nuevo
            </Link>
            {" "}y vuelve a subir el ZIP — los recibos se procesarán entonces.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-mono text-amber-900">
            {curpsNuevas.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      {errores.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-rose-700">
            Errores ({errores.length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Archivo</th>
                  <th className="px-4 py-2 font-medium">CURP</th>
                  <th className="px-4 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {errores.map((e, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono text-xs">
                      {e.archivo}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {e.curp ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-rose-700">
                      {e.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
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
