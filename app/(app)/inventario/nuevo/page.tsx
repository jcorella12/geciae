import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { ItemForm } from "./item-form";

export default async function NuevoItemPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  const [{ data: empresas }, { data: proveedores }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .in("id", empresasIds)
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("proveedores")
      .select("id, razon_social, rfc, nombre_comercial")
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
          Nuevo item de inventario
        </h1>
      </div>
      <ItemForm
        empresas={empresas ?? []}
        proveedores={proveedores ?? []}
      />
    </div>
  );
}
