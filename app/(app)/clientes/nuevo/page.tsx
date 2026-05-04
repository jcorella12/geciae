import Link from "next/link";
import { redirect } from "next/navigation";

import { obtenerVinculos, puedeGestionarClientes } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { NuevoClienteWrapper } from "./wrapper";

export const dynamic = "force-dynamic";

export default async function NuevoClientePage() {
  const vinculos = await obtenerVinculos();
  if (!puedeGestionarClientes(vinculos)) redirect("/clientes");

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
          href="/clientes"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Nuevo cliente
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Captura manual o usa IA para leer el CSF y autocompletar.
        </p>
      </div>

      <NuevoClienteWrapper empresas={empresas ?? []} />
    </div>
  );
}
