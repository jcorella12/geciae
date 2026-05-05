import Link from "next/link";
import { redirect } from "next/navigation";

import {
  esCEO,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { CargarNominaDropZone } from "./drop-zone";

export const dynamic = "force-dynamic";

export default async function CargarNominaPage() {
  const v = await obtenerVinculos();
  const empresasDirector = v
    .filter((vi) => vi.rol === "director")
    .map((vi) => vi.empresa_id);
  const puede = esCEO(v) || empresasDirector.length > 0;
  if (!puede) redirect("/personas");

  const supabase = createClient();
  const empresasIds = esCEO(v)
    ? v.map((vi) => vi.empresa_id)
    : empresasDirector;

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .in(
      "id",
      empresasIds.length > 0
        ? empresasIds
        : ["00000000-0000-0000-0000-000000000000"],
    )
    .eq("activa", true)
    .order("codigo");

  // Últimos 5 uploads
  const { data: uploads } = await supabase
    .from("nomina_uploads")
    .select(
      "id, archivo_original_nombre, total_archivos, archivos_procesados, archivos_fallidos, empleados_nuevos_detectados, total_neto_pagado, estado, created_at, empresa_id",
    )
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-6">
      <div>
        <Link
          href="/personas"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Personas
        </Link>
        <p className="mt-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Personas · Nómina
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Cargar XMLs de nómina
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube los CFDIs de nómina que recibiste de tu despacho contable.
          Acepta archivos sueltos o un ZIP. El sistema parsea, vincula con
          empleados existentes (por CURP) y archiva los XMLs para que cada
          empleado pueda descargar el suyo desde su portal.
        </p>
      </div>

      <CargarNominaDropZone empresas={empresas ?? []} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Últimos uploads</h2>
          <Link
            href="/personas/cargar-nomina/uploads"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Ver todos →
          </Link>
        </div>
        {(uploads ?? []).length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aún no hay uploads.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Archivo</th>
                  <th className="px-4 py-2 text-right font-medium">Procesados</th>
                  <th className="px-4 py-2 text-right font-medium">Fallidos</th>
                  <th className="px-4 py-2 text-right font-medium">CURPs nuevas</th>
                  <th className="px-4 py-2 text-right font-medium">Neto</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(uploads ?? []).map((u) => (
                  <tr key={u.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2 text-xs">
                      <Link
                        href={`/personas/cargar-nomina/uploads/${u.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {u.created_at
                          ? new Date(u.created_at).toLocaleString("es-MX", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {u.archivo_original_nombre ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {u.archivos_procesados} / {u.total_archivos}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-rose-700">
                      {(u.archivos_fallidos ?? 0) > 0
                        ? u.archivos_fallidos
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-amber-700">
                      {(u.empleados_nuevos_detectados ?? 0) > 0
                        ? u.empleados_nuevos_detectados
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      $
                      {Number(u.total_neto_pagado ?? 0).toLocaleString(
                        "es-MX",
                        { minimumFractionDigits: 0 },
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <EstadoBadge estado={u.estado as string} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    procesando: "bg-amber-100 text-amber-700",
    completado: "bg-emerald-100 text-emerald-700",
    completado_con_errores: "bg-orange-100 text-orange-700",
    fallido: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${map[estado] ?? "bg-secondary"}`}
    >
      {estado.replace(/_/g, " ")}
    </span>
  );
}
