import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { AlmacenForm } from "../almacen-form";

export default async function NuevoAlmacenPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  const [{ data: empresas }, { data: usuarios }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .in("id", empresasIds)
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("empleados")
      .select("usuario_id, nombre_completo")
      .in("empresa_id", empresasIds)
      .eq("activo", true)
      .not("usuario_id", "is", null)
      .order("nombre_completo"),
  ]);

  const responsables = (usuarios ?? [])
    .filter((u) => u.usuario_id)
    .map((u) => ({
      id: u.usuario_id as string,
      nombre: u.nombre_completo as string,
    }));

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/inventario/almacenes"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Almacenes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Nuevo almacén
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada almacén pertenece a una empresa y se usa para registrar entradas,
          salidas y traspasos de inventario.
        </p>
      </div>

      <AlmacenForm
        empresas={empresas ?? []}
        responsables={responsables}
      />
    </div>
  );
}
