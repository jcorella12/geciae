import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  obtenerVinculos,
  puedeAsignarCapacitacionEn,
  puedeGestionarCatalogoCapacitaciones,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { AsignarMasivoBtn } from "./asignar-masivo-btn";
import type { EmpleadoLite } from "./asignar-masivo-dialog";
import { CursoForm } from "./curso-form";
import { CursoToggleBtns } from "./curso-toggle-btns";

export const dynamic = "force-dynamic";

type Curso = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modalidad: string | null;
  duracion_horas: number | null;
  instructor_externo: string | null;
  costo: number | null;
  genera_dc3: boolean;
  vigencia_constancia_meses: number | null;
  activo: boolean;
};

export default async function CapacitacionesCatalogoPage() {
  const vinculos = await obtenerVinculos();
  if (!puedeGestionarCatalogoCapacitaciones(vinculos)) {
    redirect("/personas");
  }

  const supabase = createClient();
  const [{ data: cursos }, { data: empleadosRaw }] = await Promise.all([
    supabase
      .from("capacitaciones")
      .select(
        "id, codigo, nombre, descripcion, modalidad, duracion_horas, instructor_externo, costo, genera_dc3, vigencia_constancia_meses, activo",
      )
      .order("activo", { ascending: false })
      .order("codigo"),
    supabase
      .from("empleados")
      .select(
        "id, nombre_completo, numero_empleado, puesto, empresa_id, categoria, empresas(codigo)",
      )
      .eq("activo", true)
      .order("nombre_completo"),
  ]);

  const lista = (cursos as Curso[] | null) ?? [];
  const activos = lista.filter((c) => c.activo);
  const inactivos = lista.filter((c) => !c.activo);

  // Filtrar empleados a sólo los que el usuario puede asignar
  // capacitaciones (CEO/rh ven todos; director sólo su empresa).
  const empleadosAsignables: EmpleadoLite[] = (
    (empleadosRaw ?? []) as Array<{
      id: string;
      nombre_completo: string;
      numero_empleado: string;
      puesto: string;
      empresa_id: string;
      categoria: string;
      empresas: { codigo: string } | null;
    }>
  )
    .filter((e) => puedeAsignarCapacitacionEn(vinculos, e.empresa_id))
    .map((e) => ({
      id: e.id,
      nombre_completo: e.nombre_completo,
      numero_empleado: e.numero_empleado,
      puesto: e.puesto ?? "",
      empresa_id: e.empresa_id,
      empresa_codigo: e.empresas?.codigo ?? "?",
      categoria: e.categoria ?? "",
    }));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/personas"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Personas
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold leading-tight">
            <GraduationCap className="h-6 w-6" />
            Catálogo de capacitaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cursos disponibles para asignar a empleados. Para asignar un curso
            ya creado a alguien, abre su ficha de empleado.
          </p>
        </div>
      </div>

      <CursoForm />

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">
          Cursos activos ({activos.length})
        </h2>
        {activos.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aún no hay cursos en el catálogo. Crea el primero arriba.
          </p>
        ) : (
          <CursoTable cursos={activos} empleados={empleadosAsignables} />
        )}
      </section>

      {inactivos.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-muted-foreground">
            Cursos desactivados ({inactivos.length})
          </h2>
          <CursoTable cursos={inactivos} empleados={empleadosAsignables} />
        </section>
      )}
    </div>
  );
}

function CursoTable({
  cursos,
  empleados,
}: {
  cursos: Curso[];
  empleados: EmpleadoLite[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-secondary/50">
          <tr className="text-left">
            <th className="px-3 py-2 font-medium">Código</th>
            <th className="px-3 py-2 font-medium">Nombre</th>
            <th className="px-3 py-2 font-medium">Modalidad</th>
            <th className="px-3 py-2 text-right font-medium">Horas</th>
            <th className="px-3 py-2 text-right font-medium">Costo</th>
            <th className="px-3 py-2 text-right font-medium">Vigencia</th>
            <th className="px-3 py-2 text-center font-medium">DC-3</th>
            <th className="px-3 py-2 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cursos.map((c) => (
            <tr key={c.id} className="align-top hover:bg-secondary/30">
              <td className="px-3 py-2 font-mono text-xs">{c.codigo}</td>
              <td className="px-3 py-2">
                <div className="font-medium">{c.nombre}</div>
                {c.descripcion && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                    {c.descripcion}
                  </div>
                )}
                {c.instructor_externo && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Instructor: {c.instructor_externo}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 capitalize">
                {c.modalidad ?? <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {c.duracion_horas
                  ? `${c.duracion_horas} h`
                  : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {c.costo != null
                  ? `$${Number(c.costo).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                  : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {c.vigencia_constancia_meses
                  ? `${c.vigencia_constancia_meses} m`
                  : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-3 py-2 text-center">
                {c.genera_dc3 ? (
                  <span className="text-emerald-700">✓</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex justify-end gap-1">
                  {c.activo && empleados.length > 0 && (
                    <AsignarMasivoBtn
                      curso={{
                        id: c.id,
                        codigo: c.codigo,
                        nombre: c.nombre,
                      }}
                      empleados={empleados}
                    />
                  )}
                  <CursoToggleBtns id={c.id} activo={c.activo} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

