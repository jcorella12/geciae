/* eslint-disable @typescript-eslint/no-explicit-any */
import { Camera } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { FotoForm } from "./foto-form";

export const metadata = { title: "Foto / evidencia" };
export const dynamic = "force-dynamic";

export default async function CampoFotoPage({
  searchParams,
}: {
  searchParams?: { proyecto?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <div className="p-8">Sin sesión.</div>;

  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));
  const proyectoId = searchParams?.proyecto;

  // --- Sin proyecto: elegir uno ---
  if (!proyectoId) {
    const { data: proyectos } = await (supabase as any)
      .from("proyectos")
      .select("id, codigo, nombre")
      .in(
        "empresa_id",
        empresasIds.length ? empresasIds : ["00000000-0000-0000-0000-000000000000"],
      )
      .in("estado", ["en_ejecucion", "planeacion", "en_cierre"])
      .order("created_at", { ascending: false })
      .limit(30);

    return (
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <div className="mb-1 flex items-center gap-2">
          <Camera className="h-5 w-5 text-brand" />
          <h1 className="text-[20px] font-semibold leading-tight">
            Foto / evidencia
          </h1>
        </div>
        <p className="mb-5 text-[13px] text-ink-3">
          Elige el proyecto al que pertenece la foto.
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
                    href={`/campo/foto?proyecto=${p.id}`}
                    className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 hover:border-brand"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-ink-3">{p.codigo}</p>
                      <p className="line-clamp-1 text-[13px] font-medium">
                        {p.nombre}
                      </p>
                    </div>
                    <Camera className="h-4 w-4 shrink-0 text-brand" />
                  </Link>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    );
  }

  // --- Con proyecto: capturar ---
  const { data: proyecto } = await (supabase as any)
    .from("proyectos")
    .select("id, codigo, nombre")
    .eq("id", proyectoId)
    .maybeSingle();

  if (!proyecto) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <p className="rounded-md border border-dashed border-border bg-card p-6 text-center text-[13px] text-ink-3">
          Proyecto no encontrado o sin acceso.{" "}
          <Link href="/campo/foto" className="text-brand hover:underline">
            Elegir otro
          </Link>
        </p>
      </div>
    );
  }

  return (
    <FotoForm
      proyecto={{ id: proyecto.id, codigo: proyecto.codigo, nombre: proyecto.nombre }}
    />
  );
}
