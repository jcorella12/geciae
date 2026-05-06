/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { HorasSemanaForm } from "./horas-semana-form";

export const dynamic = "force-dynamic";

function inicioSemanaISO(d: Date): string {
  const dia = d.getDay() || 7; // 1=lunes, 7=domingo
  const diff = dia - 1;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - diff);
  return lunes.toISOString().slice(0, 10);
}

export default async function MisHorasPage({
  searchParams,
}: {
  searchParams?: { semana?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-8">Sin sesión.</div>;

  const semana = searchParams?.semana ?? inicioSemanaISO(new Date());

  // Empleado vinculado
  const { data: emp } = await (supabase as any)
    .from("empleados")
    .select("id, nombre_completo, empresa_id, puesto")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!emp) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-semibold">Mis horas</h1>
        <p className="mt-3 text-sm text-ink-3">
          Tu cuenta no está vinculada a un empleado. Pide a RH que te asocie con tu
          ficha de empleado para registrar horas.
        </p>
      </div>
    );
  }

  // Proyectos donde el empleado tiene asignación (tareas activas o jefe)
  const { data: proyectos } = await (supabase as any)
    .from("proyectos")
    .select("id, codigo, nombre, empresa_id, estado")
    .in("estado", ["en_ejecucion", "planeacion", "en_cierre"])
    .eq("empresa_id", emp.empresa_id)
    .order("codigo");

  // Horas ya registradas en esta semana
  const { data: registradas } = await (supabase as any)
    .from("proyecto_horas_trabajadas")
    .select("proyecto_id, horas")
    .eq("empleado_id", emp.id)
    .eq("tipo", "ingenieria_propia")
    .eq("semana_inicio", semana);

  const horasPorProyecto = new Map<string, number>();
  for (const r of (registradas ?? []) as Array<{
    proyecto_id: string;
    horas: number;
  }>) {
    horasPorProyecto.set(r.proyecto_id, Number(r.horas));
  }

  const totalHoras = (registradas ?? []).reduce(
    (acc: number, r: { horas: number }) => acc + Number(r.horas),
    0,
  );

  // Navegación de semana
  const lunes = new Date(semana);
  const semanaPrev = new Date(lunes);
  semanaPrev.setDate(lunes.getDate() - 7);
  const semanaProx = new Date(lunes);
  semanaProx.setDate(lunes.getDate() + 7);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <p className="lbl-mini">Personas · Mis horas</p>
        <h1 className="mt-1 text-2xl font-semibold">Registro semanal de horas</h1>
        <p className="mt-1 text-sm text-ink-3">
          {emp.nombre_completo}
          {emp.puesto && <> · {emp.puesto}</>}
        </p>
      </div>

      {/* Selector de semana */}
      <div className="mb-5 flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
        <Link
          href={`/personas/horas?semana=${semanaPrev.toISOString().slice(0, 10)}`}
          className="text-sm text-brand hover:underline"
        >
          ← Semana anterior
        </Link>
        <p className="text-sm font-medium">
          Semana del {new Date(semana).toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <Link
          href={`/personas/horas?semana=${semanaProx.toISOString().slice(0, 10)}`}
          className="text-sm text-brand hover:underline"
        >
          Semana siguiente →
        </Link>
      </div>

      {(proyectos ?? []).length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-ink-3">
          Sin proyectos activos en tu empresa. Pide a tu director que te asigne a
          uno o que lo active.
        </p>
      ) : (
        <HorasSemanaForm
          semana={semana}
          totalActual={totalHoras}
          proyectos={(proyectos ?? []).map((p: any) => ({
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            horasYaRegistradas: horasPorProyecto.get(p.id) ?? 0,
          }))}
        />
      )}
    </div>
  );
}
