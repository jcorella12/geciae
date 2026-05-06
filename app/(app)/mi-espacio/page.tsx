import { Briefcase, Car, ClipboardList, Wallet } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MiEspacioPage() {
  const supabase = createClient();
  await obtenerVinculos();
  const { data: { user } } = await supabase.auth.getUser();

  // Empleado vinculado
  const { data: empleado } = (await supabase
    .from("empleados")
    .select("id, nombre_completo, puesto")
    .eq("usuario_id", user?.id ?? "")
    .maybeSingle()) as unknown as {
    data: { id: string; nombre_completo: string; puesto: string | null } | null;
  };

  const nombre = empleado?.nombre_completo ?? user?.email ?? "Hola";

  const cards = [
    {
      titulo: "Mis tareas",
      descripcion: "Tareas asignadas que puedes completar hoy",
      href: "/mi-dia",
      icon: ClipboardList,
      bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
    },
    {
      titulo: "Mis proyectos",
      descripcion: "Proyectos en los que participas",
      href: "/proyectos",
      icon: Briefcase,
      bg: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    },
    {
      titulo: "Mi compensación",
      descripcion: "Sueldo, bonos, vacaciones, viáticos",
      href: "/perfil",
      icon: Wallet,
      bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
    },
    {
      titulo: "Mi vehículo",
      descripcion: "Vehículo asignado y consumo de gasolina",
      href: "/perfil",
      icon: Car,
      bg: "bg-violet-50 hover:bg-violet-100 border-violet-200",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-8">
        <p className="text-[12px] uppercase tracking-wide text-ink-3">Mi espacio</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">Hola, {nombre.split(" ")[0]}</h1>
        {empleado?.puesto && (
          <p className="mt-1 text-sm text-ink-3">{empleado.puesto}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.titulo}
            href={c.href}
            className={`flex items-start gap-4 rounded-lg border p-5 transition ${c.bg}`}
          >
            <c.icon className="h-8 w-8 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-base font-semibold">{c.titulo}</p>
              <p className="mt-1 text-[13px] opacity-80">{c.descripcion}</p>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-center text-[12px] text-ink-3">
        ¿Quieres más opciones?{" "}
        <Link href="/perfil" className="text-brand hover:underline">
          Cambiar a vista avanzada
        </Link>
      </p>
    </div>
  );
}
