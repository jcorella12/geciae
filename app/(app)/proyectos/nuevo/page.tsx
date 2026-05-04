import Link from "next/link";
import { redirect } from "next/navigation";

import {
  empresasDondeGestionaProyectos,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { ProyectoForm } from "../proyecto-form";

export default async function NuevoProyectoPage() {
  const vinculos = await obtenerVinculos();
  const empresasIds = empresasDondeGestionaProyectos(vinculos);
  if (empresasIds.length === 0) redirect("/proyectos");

  const supabase = createClient();

  const [{ data: empresas }, { data: clientes }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .in("id", empresasIds)
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("clientes")
      .select("id, razon_social, rfc")
      .eq("activo", true)
      .order("razon_social"),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/proyectos"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Proyectos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Nuevo proyecto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos básicos. Etapas, hitos y bitácora se agregan en Sprint 7.
        </p>
      </div>

      <ProyectoForm
        empresas={empresas ?? []}
        clientes={clientes ?? []}
      />
    </div>
  );
}
