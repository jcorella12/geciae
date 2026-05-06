import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { MovimientoForm } from "./movimiento-form";

export default async function NuevoMovimientoPage({
  searchParams,
}: {
  searchParams: { producto?: string; proyecto?: string; tipo?: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  const [
    { data: empresas },
    { data: items },
    { data: almacenes },
    { data: proyectos },
    { data: proveedores },
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, nombre_comercial")
      .in("id", empresasIds)
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("catalogo_productos")
      .select("id, codigo, nombre, unidad_medida, costo_promedio, empresa_id")
      .in("empresa_id", empresasIds)
      .eq("activo", true)
      .order("nombre")
      .limit(500),
    // Almacenes propios de las empresas del usuario + compartidos del grupo.
    // RLS ya filtra; aquí solo aplicamos `activo` y traemos todos.
    supabase
      .from("almacenes")
      .select("id, codigo, nombre, empresa_id, compartido" as never)
      .eq("activo", true)
      .order("compartido", { ascending: false })
      .order("nombre"),
    supabase
      .from("proyectos")
      .select("id, codigo, nombre, empresa_id")
      .in("empresa_id", empresasIds)
      .eq("activo", true)
      .in("estado", ["en_ejecucion", "planeacion", "en_cierre"])
      .order("codigo"),
    supabase
      .from("proveedores")
      .select("id, razon_social, rfc")
      .eq("activo", true)
      .order("razon_social")
      .limit(200),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/inventario"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Inventario
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Registrar movimiento de inventario
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Entradas (compras), salidas (a proyecto / venta), traspasos y ajustes.
        </p>
      </div>
      <MovimientoForm
        empresas={empresas ?? []}
        items={items ?? []}
        almacenes={(almacenes ?? []) as never}
        proyectos={proyectos ?? []}
        proveedores={proveedores ?? []}
        defaults={{
          producto_id: searchParams.producto,
          proyecto_id: searchParams.proyecto,
          tipo: searchParams.tipo,
        }}
      />
    </div>
  );
}
