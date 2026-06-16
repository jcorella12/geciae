/* eslint-disable @typescript-eslint/no-explicit-any */
import { Smartphone, Users2 } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { AsistenciaForm } from "./asistencia-form";

export const metadata = { title: "Asistencia de cuadrilla" };
export const dynamic = "force-dynamic";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AsistenciaCampoPage({
  searchParams,
}: {
  searchParams?: { proyecto?: string; fecha?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <div className="p-8">Sin sesión.</div>;

  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));
  const fecha = searchParams?.fecha ?? hoyISO();
  const proyectoId = searchParams?.proyecto;

  // Ficha de empleado del usuario (para identificar a "su cuadrilla").
  const { data: miEmpleado } = await (supabase as any)
    .from("empleados")
    .select("id, empresa_id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  // --- Sin proyecto: elegir uno ---
  if (!proyectoId) {
    const { data: proyectos } = await (supabase as any)
      .from("proyectos")
      .select("id, codigo, nombre, empresa_id")
      .in("empresa_id", empresasIds.length ? empresasIds : ["00000000-0000-0000-0000-000000000000"])
      .in("estado", ["en_ejecucion", "planeacion", "en_cierre"])
      .order("created_at", { ascending: false })
      .limit(30);

    return (
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <div className="mb-1 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-brand" />
          <h1 className="text-[20px] font-semibold leading-tight">
            Pasar asistencia
          </h1>
        </div>
        <p className="mb-5 text-[13px] text-ink-3">
          Elige el proyecto donde está trabajando tu cuadrilla hoy.
        </p>
        {(proyectos ?? []).length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card p-6 text-center text-[13px] text-ink-3">
            No hay proyectos activos en tu empresa.
          </p>
        ) : (
          <ul className="space-y-2">
            {(proyectos ?? []).map(
              (p: { id: string; codigo: string; nombre: string }) => (
                <li key={p.id}>
                  <Link
                    href={`/campo/asistencia?proyecto=${p.id}&fecha=${fecha}`}
                    className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 hover:border-brand"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-ink-3">{p.codigo}</p>
                      <p className="line-clamp-1 text-[13px] font-medium">
                        {p.nombre}
                      </p>
                    </div>
                    <Users2 className="h-4 w-4 shrink-0 text-brand" />
                  </Link>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    );
  }

  // --- Con proyecto: lista de la cuadrilla ---
  const { data: proyecto } = await (supabase as any)
    .from("proyectos")
    .select("id, codigo, nombre, empresa_id")
    .eq("id", proyectoId)
    .maybeSingle();

  if (!proyecto) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <p className="rounded-md border border-dashed border-border bg-card p-6 text-center text-[13px] text-ink-3">
          Proyecto no encontrado o sin acceso.{" "}
          <Link href="/campo/asistencia" className="text-brand hover:underline">
            Elegir otro
          </Link>
        </p>
      </div>
    );
  }

  // "Mi cuadrilla" = empleados cuyo jefe directo soy yo, en la empresa del
  // proyecto. Si no hay (jefe_directo aún sin capturar), caer a todos los
  // activos de la empresa para no bloquear el uso.
  let empleados: any[] = [];
  if (miEmpleado?.id) {
    const { data: cuadrilla } = await (supabase as any)
      .from("empleados")
      .select("id, nombre_completo, puesto")
      .eq("empresa_id", proyecto.empresa_id)
      .eq("jefe_directo_id", miEmpleado.id)
      .eq("activo", true)
      .order("nombre_completo");
    empleados = cuadrilla ?? [];
  }
  let fallbackTodos = false;
  if (empleados.length === 0) {
    const { data: todos } = await (supabase as any)
      .from("empleados")
      .select("id, nombre_completo, puesto")
      .eq("empresa_id", proyecto.empresa_id)
      .eq("activo", true)
      .order("nombre_completo")
      .limit(100);
    empleados = todos ?? [];
    fallbackTodos = true;
  }

  // Asistencia ya registrada para ese día.
  const { data: previas } = await (supabase as any)
    .from("asistencia_campo")
    .select("empleado_id, presente, horas")
    .eq("proyecto_id", proyectoId)
    .eq("fecha", fecha);

  const prev = new Map<string, { presente: boolean; horas: number | null }>();
  for (const r of (previas ?? []) as Array<{
    empleado_id: string;
    presente: boolean;
    horas: number | null;
  }>) {
    prev.set(r.empleado_id, {
      presente: r.presente,
      horas: r.horas == null ? null : Number(r.horas),
    });
  }

  const lista = empleados.map((e) => {
    const p = prev.get(e.id);
    return {
      id: e.id as string,
      nombre: e.nombre_completo as string,
      puesto: (e.puesto as string | null) ?? null,
      presente: p ? p.presente : true,
      horas: p ? p.horas : 8,
      yaRegistrado: !!p,
    };
  });

  return (
    <AsistenciaForm
      proyecto={{ id: proyecto.id, codigo: proyecto.codigo, nombre: proyecto.nombre }}
      fecha={fecha}
      empleados={lista}
      mostrandoTodos={fallbackTodos}
    />
  );
}
