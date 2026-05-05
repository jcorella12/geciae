import Link from "next/link";
import { redirect } from "next/navigation";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

export default async function PlantillasListaPage() {
  const v = await obtenerVinculos();
  if (v.length === 0) redirect("/mi-dia");

  const supabase = createClient();
  const { data: plantillas } = await supabase
    .from("plantillas_proyecto")
    .select(
      "codigo, nombre, descripcion, duracion_estimada_dias, requiere_tramites_cfe, requiere_levantamiento_tecnico, activa, empresa_recomendada_id, empresas(codigo, nombre_comercial)",
    )
    .order("codigo");

  // Conteos: # etapas y # docs por plantilla
  const { data: etapasCount } = await supabase
    .from("plantilla_etapas")
    .select("plantilla_codigo");
  const { data: docsCount } = await supabase
    .from("plantilla_documentos")
    .select("plantilla_codigo");

  const etapasPorCodigo: Record<string, number> = {};
  for (const e of etapasCount ?? []) {
    const k = (e as { plantilla_codigo: string }).plantilla_codigo;
    etapasPorCodigo[k] = (etapasPorCodigo[k] ?? 0) + 1;
  }
  const docsPorCodigo: Record<string, number> = {};
  for (const d of docsCount ?? []) {
    const k = (d as { plantilla_codigo: string }).plantilla_codigo;
    docsPorCodigo[k] = (docsPorCodigo[k] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Configuración
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Plantillas de proyecto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada plantilla define etapas, tareas y documentos requeridos. Cuando
          se crea un proyecto con una plantilla asignada, las etapas y docs se
          copian automáticamente. Solo CEO puede modificar.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Empresa sugerida</th>
              <th className="px-4 py-2 text-right font-medium">Etapas</th>
              <th className="px-4 py-2 text-right font-medium">Docs</th>
              <th className="px-4 py-2 text-right font-medium">Días est.</th>
              <th className="px-4 py-2 font-medium">Flags</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(plantillas ?? []).map((p) => {
              const emp = p.empresas as
                | { codigo: string; nombre_comercial: string | null }
                | null;
              return (
                <tr
                  key={p.codigo}
                  className="cursor-pointer hover:bg-secondary/30"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/proyectos/plantillas/${p.codigo}`}
                      className="hover:text-primary hover:underline"
                    >
                      {p.codigo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/proyectos/plantillas/${p.codigo}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {p.nombre}
                    </Link>
                    {p.descripcion && (
                      <p className="text-xs text-muted-foreground">
                        {p.descripcion}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {emp ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            codigoColor[emp.codigo] ?? "bg-muted-foreground"
                          }`}
                        />
                        {emp.codigo}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {etapasPorCodigo[p.codigo] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {docsPorCodigo[p.codigo] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {p.duracion_estimada_dias ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.requiere_tramites_cfe && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">
                          CFE
                        </span>
                      )}
                      {p.requiere_levantamiento_tecnico && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-700">
                          Levantamiento
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.activa ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                        Activa
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        Inactiva
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {(plantillas ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Sin plantillas. (El seed Sprint 7 debería haber creado 9.)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: click en cualquier plantilla para ver y editar sus etapas, tareas
        y documentos requeridos.
      </p>
    </div>
  );
}
