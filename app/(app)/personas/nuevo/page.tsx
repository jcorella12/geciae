import Link from "next/link";
import { redirect } from "next/navigation";

import {
  empresasDondeGestionaEmpleados,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { NuevoEmpleadoWrapper } from "./wrapper";

export default async function NuevoEmpleadoPage() {
  const vinculos = await obtenerVinculos();
  const empresasIds = empresasDondeGestionaEmpleados(vinculos);
  if (empresasIds.length === 0) redirect("/personas");

  const supabase = createClient();
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .in("id", empresasIds)
    .eq("activa", true)
    .order("codigo");

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/personas"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Personas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Nuevo empleado
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Captura manual o sube el INE para autocompletar con IA.
        </p>
      </div>

      <NuevoEmpleadoWrapper empresasGestionables={empresas ?? []} />
    </div>
  );
}
