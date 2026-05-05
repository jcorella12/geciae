import Link from "next/link";
import { notFound } from "next/navigation";

import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import {
  EditarPlantillaForm,
  EliminarDocumentoButton,
  EliminarEtapaButton,
  EliminarTareaButton,
  NuevaEtapaForm,
  NuevaTareaForm,
  NuevoDocumentoForm,
} from "./forms";

export const dynamic = "force-dynamic";

export default async function PlantillaDetallePage({
  params,
}: {
  params: { codigo: string };
}) {
  const v = await obtenerVinculos();
  const puedeEditar = esCEO(v);

  const supabase = createClient();
  const { data: plantilla } = await supabase
    .from("plantillas_proyecto")
    .select(
      "codigo, nombre, descripcion, duracion_estimada_dias, requiere_tramites_cfe, requiere_levantamiento_tecnico, notas, activa, empresas(codigo, nombre_comercial)",
    )
    .eq("codigo", params.codigo as never)
    .maybeSingle();
  if (!plantilla) notFound();

  const { data: etapas } = await supabase
    .from("plantilla_etapas")
    .select(
      "id, numero, nombre, descripcion, duracion_estimada_dias, hito_facturacion, porcentaje_facturacion",
    )
    .eq("plantilla_codigo", params.codigo as never)
    .order("numero");

  // Cargar tareas de todas las etapas
  const etapaIds = (etapas ?? []).map((e) => e.id);
  const { data: tareas } = etapaIds.length
    ? await supabase
        .from("plantilla_tareas")
        .select(
          "id, etapa_id, numero, titulo, descripcion, rol_responsable, obligatoria, bloquea_avance",
        )
        .in("etapa_id", etapaIds)
        .order("etapa_id")
        .order("numero")
    : { data: [] as Array<Record<string, unknown>> };

  const tareasPorEtapa = new Map<string, Array<Record<string, unknown>>>();
  for (const t of tareas ?? []) {
    const eid = (t as { etapa_id: string }).etapa_id;
    if (!tareasPorEtapa.has(eid)) tareasPorEtapa.set(eid, []);
    tareasPorEtapa.get(eid)!.push(t as never);
  }

  const { data: docs } = await supabase
    .from("plantilla_documentos")
    .select(
      "id, codigo_documento, nombre, descripcion, obligatorio, requerido_para_estado, rol_responsable",
    )
    .eq("plantilla_codigo", params.codigo as never)
    .order("requerido_para_estado", { nullsFirst: false })
    .order("codigo_documento");

  const siguienteNumeroEtapa = ((etapas ?? []).at(-1)?.numero ?? 0) + 1;

  const empresa = plantilla.empresas as
    | { codigo: string; nombre_comercial: string | null }
    | null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/configuracion/plantillas"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a plantillas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          {plantilla.nombre}
        </h1>
        <p className="text-sm text-muted-foreground">
          <code className="font-mono">{plantilla.codigo}</code>
          {empresa && ` · sugerida para ${empresa.codigo}`}
          {!puedeEditar && " · solo lectura"}
        </p>
      </div>

      {/* Metadata */}
      <EditarPlantillaForm
        plantilla={{
          codigo: plantilla.codigo as string,
          nombre: plantilla.nombre,
          descripcion: plantilla.descripcion,
          duracion_estimada_dias: plantilla.duracion_estimada_dias,
          requiere_tramites_cfe: plantilla.requiere_tramites_cfe,
          requiere_levantamiento_tecnico: plantilla.requiere_levantamiento_tecnico,
          notas: plantilla.notas,
        }}
        puedeEditar={puedeEditar}
      />

      {/* Etapas */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Etapas y tareas ({(etapas ?? []).length})
          </h2>
          {puedeEditar && (
            <NuevaEtapaForm
              plantillaCodigo={plantilla.codigo as string}
              siguienteNumero={siguienteNumeroEtapa}
            />
          )}
        </div>

        {(etapas ?? []).length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Esta plantilla aún no tiene etapas. Agrega la primera con el botón
            de arriba.
          </p>
        ) : (
          <div className="space-y-3">
            {(etapas ?? []).map((e) => {
              const ts = tareasPorEtapa.get(e.id) ?? [];
              const sigT = (
                (ts.at(-1) as { numero?: number } | undefined)?.numero ?? 0
              ) + 1;
              return (
                <details
                  key={e.id}
                  open
                  className="rounded-lg border border-border bg-card shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/30">
                    <div>
                      <p className="font-medium">
                        <span className="font-mono text-xs text-muted-foreground">
                          {e.numero}.
                        </span>{" "}
                        {e.nombre}
                        {e.hito_facturacion && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                            Hito {e.porcentaje_facturacion ? `${e.porcentaje_facturacion}%` : ""}
                          </span>
                        )}
                      </p>
                      {e.descripcion && (
                        <p className="text-xs text-muted-foreground">
                          {e.descripcion}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {ts.length} tarea{ts.length === 1 ? "" : "s"}
                        {e.duracion_estimada_dias != null &&
                          ` · ${e.duracion_estimada_dias}d`}
                      </span>
                      {puedeEditar && (
                        <EliminarEtapaButton
                          etapaId={e.id}
                          plantillaCodigo={plantilla.codigo as string}
                        />
                      )}
                    </div>
                  </summary>

                  <div className="border-t border-border p-4">
                    {ts.length > 0 && (
                      <ul className="mb-3 space-y-1.5 text-sm">
                        {ts.map((t) => {
                          const tt = t as {
                            id: string;
                            numero: number;
                            titulo: string;
                            descripcion: string | null;
                            rol_responsable: string | null;
                            obligatoria: boolean;
                            bloquea_avance: boolean;
                          };
                          return (
                            <li
                              key={tt.id}
                              className="flex items-start justify-between gap-2 rounded-md bg-bg-2 px-3 py-2"
                            >
                              <div className="flex-1">
                                <p className="text-sm">
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {e.numero}.{tt.numero}
                                  </span>{" "}
                                  {tt.titulo}
                                </p>
                                <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px]">
                                  {tt.rol_responsable && (
                                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-blue-700">
                                      {tt.rol_responsable}
                                    </span>
                                  )}
                                  {tt.obligatoria && (
                                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">
                                      obligatoria
                                    </span>
                                  )}
                                  {tt.bloquea_avance && (
                                    <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-rose-700">
                                      bloquea avance
                                    </span>
                                  )}
                                </div>
                              </div>
                              {puedeEditar && (
                                <EliminarTareaButton
                                  tareaId={tt.id}
                                  plantillaCodigo={
                                    plantilla.codigo as string
                                  }
                                />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {puedeEditar && (
                      <NuevaTareaForm
                        etapaId={e.id}
                        plantillaCodigo={plantilla.codigo as string}
                        siguienteNumero={sigT}
                      />
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {/* Documentos */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Documentos requeridos ({(docs ?? []).length})
          </h2>
          {puedeEditar && (
            <NuevoDocumentoForm
              plantillaCodigo={plantilla.codigo as string}
            />
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Para estado</th>
                <th className="px-4 py-2 font-medium">Rol</th>
                <th className="px-4 py-2 font-medium">Obligatorio</th>
                {puedeEditar && (
                  <th className="px-4 py-2 text-right font-medium">Acción</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(docs ?? []).map((d) => (
                <tr key={d.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-2 font-mono text-xs">
                    {d.codigo_documento}
                  </td>
                  <td className="px-4 py-2">
                    {d.nombre}
                    {d.descripcion && (
                      <p className="text-xs text-muted-foreground">
                        {d.descripcion}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {d.requerido_para_estado ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {d.rol_responsable ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {d.obligatorio ? "Sí" : "No"}
                  </td>
                  {puedeEditar && (
                    <td className="px-4 py-2 text-right">
                      <EliminarDocumentoButton
                        documentoId={d.id}
                        plantillaCodigo={plantilla.codigo as string}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {(docs ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={puedeEditar ? 6 : 5}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    Esta plantilla no tiene documentos requeridos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Tip: los cambios solo aplican a proyectos NUEVOS creados con esta
        plantilla. Los proyectos existentes mantienen su expediente y tareas
        ya generados.
      </p>
    </div>
  );
}
