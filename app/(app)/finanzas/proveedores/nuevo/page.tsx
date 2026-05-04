import Link from "next/link";
import { redirect } from "next/navigation";

import { obtenerVinculos, puedeGestionarProveedores } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { NuevoProveedorWrapper } from "./wrapper";

export const dynamic = "force-dynamic";

export default async function NuevoProveedorPage() {
  const vinculos = await obtenerVinculos();
  if (!puedeGestionarProveedores(vinculos)) redirect("/finanzas/proveedores");

  const supabase = createClient();
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .eq("activa", true)
    .order("codigo");

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/proveedores"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Proveedores
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Nuevo proveedor
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Captura manual o sube el CSF para autocompletar con IA.
        </p>
      </div>

      <NuevoProveedorWrapper empresas={empresas ?? []} />
    </div>
  );
}
