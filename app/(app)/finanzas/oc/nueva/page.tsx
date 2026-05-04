import Link from "next/link";
import { redirect } from "next/navigation";

import { empresasDondeCreaOC, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { OCForm } from "../oc-form";

export default async function NuevaOCPage({
  searchParams,
}: {
  searchParams: { proyecto?: string };
}) {
  const vinculos = await obtenerVinculos();
  const empresasIds = empresasDondeCreaOC(vinculos);
  if (empresasIds.length === 0) redirect("/finanzas/oc");

  const supabase = createClient();

  const [{ data: empresas }, { data: proveedores }, { data: proyectos }] =
    await Promise.all([
      supabase
        .from("empresas")
        .select("id, codigo, razon_social, nombre_comercial")
        .in("id", empresasIds)
        .eq("activa", true)
        .order("codigo"),
      supabase
        .from("proveedores")
        .select("id, razon_social, rfc, semaforo")
        .eq("activo", true)
        .order("razon_social"),
      supabase
        .from("proyectos")
        .select("id, codigo, nombre, empresa_id, estado")
        .eq("activo", true)
        .in("estado", [
          "cotizacion",
          "contrato_firmado",
          "planeacion",
          "en_ejecucion",
          "en_cierre",
        ])
        .order("codigo"),
    ]);

  // Si llega ?proyecto=ID, validar y pre-seleccionar empresa.
  let empresaPreseleccionada: string | undefined;
  if (searchParams.proyecto && proyectos) {
    const proy = proyectos.find((p) => p.id === searchParams.proyecto);
    if (proy && empresasIds.includes(proy.empresa_id)) {
      empresaPreseleccionada = proy.empresa_id;
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/oc"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Órdenes de compra
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">Nueva OC</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Captura los conceptos. La OC arranca como <strong>borrador</strong>.
          Cuando esté lista, la envías a aprobación.
        </p>
      </div>

      <OCForm
        empresas={empresas ?? []}
        proveedores={proveedores ?? []}
        proyectos={proyectos ?? []}
        defaultProyectoId={searchParams.proyecto ?? null}
        defaultEmpresaId={empresaPreseleccionada}
      />
    </div>
  );
}
