import {
  Camera,
  Car,
  ClipboardList,
  Fuel,
  Package,
  Plus,
  Smartphone,
  UserCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Captura desde campo" };
export const dynamic = "force-dynamic";

/**
 * Vista mobile-first para captura rápida desde campo.
 * Diseñada para uso en celular (cuadrillas, supervisores en sitio).
 */
export default async function CampoPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  // Top vehículos del usuario para acceso rápido
  const { data: vehiculos } = await supabase
    .from("vehiculos")
    .select("id, placa, marca, modelo, numero_economico")
    .in("empresa_id", empresasIds)
    .eq("estatus", "activo")
    .order("placa")
    .limit(8);

  // Proyectos activos
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("id, codigo, nombre")
    .in("empresa_id", empresasIds)
    .in("estado", ["en_ejecucion", "planeacion", "en_cierre"])
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-brand" />
        <h1 className="text-[20px] font-semibold leading-tight">
          Captura desde campo
        </h1>
      </div>
      <p className="mb-5 text-[13px] text-ink-3">
        Acciones rápidas para usar desde el celular en sitio.
      </p>

      {/* Acción principal: pasar asistencia de la cuadrilla */}
      <Link
        href="/campo/asistencia"
        className="mb-3 flex items-center gap-3 rounded-lg border border-brand bg-brand-soft/40 p-4 shadow-xs transition hover:bg-brand-soft/70"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <UserCheck className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">
            Pasar asistencia
          </span>
          <span className="block text-[11px] text-ink-3">
            Marca quién vino hoy en tu proyecto
          </span>
        </div>
        <Plus className="h-5 w-5 shrink-0 text-brand" />
      </Link>

      {/* Acciones principales en grid 2x2 grandes */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <Link
          href="/activos/vehiculos"
          className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 shadow-xs hover:border-brand"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Fuel className="h-6 w-6 text-amber-700" />
          </span>
          <span className="text-[13px] font-semibold">Carga combustible</span>
          <span className="text-[10.5px] text-ink-3">
            Selecciona vehículo
          </span>
        </Link>
        <Link
          href="/activos/vehiculos"
          className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 shadow-xs hover:border-brand"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Wrench className="h-6 w-6 text-blue-700" />
          </span>
          <span className="text-[13px] font-semibold">Mantenimiento</span>
          <span className="text-[10.5px] text-ink-3">Bitácora vehicular</span>
        </Link>
        <Link
          href="/campo/foto"
          className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 shadow-xs hover:border-brand"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <Camera className="h-6 w-6 text-emerald-700" />
          </span>
          <span className="text-[13px] font-semibold">Foto / evidencia</span>
          <span className="text-[10.5px] text-ink-3">Sube foto al proyecto</span>
        </Link>
        <Link
          href="/campo/ticket"
          className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 shadow-xs hover:border-brand"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ClipboardList className="h-6 w-6 text-red-700" />
          </span>
          <span className="text-[13px] font-semibold">Reportar incidente</span>
          <span className="text-[10.5px] text-ink-3">Ticket ligado a proyecto</span>
        </Link>
        <Link
          href="/campo/material"
          className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 shadow-xs hover:border-brand"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <Package className="h-6 w-6 text-indigo-700" />
          </span>
          <span className="text-[13px] font-semibold">Material a obra</span>
          <span className="text-[10.5px] text-ink-3">Salida de almacén</span>
        </Link>
      </div>

      {/* Vehículos rápidos */}
      {vehiculos && vehiculos.length > 0 && (
        <section className="mb-5">
          <div className="mb-2 flex items-center gap-2">
            <Car className="h-4 w-4 text-ink-3" />
            <h2 className="text-[13px] font-semibold">Mis vehículos</h2>
          </div>
          <ul className="space-y-2">
            {vehiculos.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/activos/vehiculos/${v.id}`}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 hover:border-brand"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[12.5px] font-medium">
                      {v.placa ?? v.numero_economico ?? "—"}
                    </p>
                    <p className="text-[10.5px] text-ink-3">
                      {v.marca} {v.modelo}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-brand" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Proyectos activos */}
      {proyectos && proyectos.length > 0 && (
        <section className="mb-5">
          <div className="mb-2 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-ink-3" />
            <h2 className="text-[13px] font-semibold">Proyectos activos</h2>
          </div>
          <ul className="space-y-2">
            {proyectos.map(
              (p: { id: string; codigo: string; nombre: string }) => (
                <li key={p.id}>
                  <Link
                    href={`/proyectos/${p.id}`}
                    className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 hover:border-brand"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11.5px] text-ink-3">
                        {p.codigo}
                      </p>
                      <p className="line-clamp-1 text-[12.5px] font-medium">
                        {p.nombre}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-brand" />
                  </Link>
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      <p className="mt-6 rounded-md border border-divider bg-bg-2/40 p-3 text-center text-[10.5px] text-ink-3">
        💡 Instala la app desde el menú del navegador para abrirla desde el ícono
        del celular sin entrar al navegador.
      </p>
    </div>
  );
}
