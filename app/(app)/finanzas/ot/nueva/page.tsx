import Link from "next/link";
import { redirect } from "next/navigation";

import { empresasDondeCreaOC, obtenerVinculos } from "@/lib/auth/permisos";
import { listarCentrosActivos } from "@/lib/centros/listar";
import { createClient } from "@/lib/supabase/server";

import { OTForm } from "../ot-form";

export default async function NuevaOTPage({
  searchParams,
}: {
  searchParams?: { solicitud_origen?: string; proyecto?: string };
}) {
  const vinculos = await obtenerVinculos();
  const empresasOrigenIds = empresasDondeCreaOC(vinculos);
  if (empresasOrigenIds.length === 0) redirect("/finanzas/ot");

  const supabase = createClient();
  const centros = await listarCentrosActivos();
  const [
    { data: empresas },
    { data: servicios },
    { data: proyectos },
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("catalogo_servicios")
      .select(
        "id, empresa_id, codigo, nombre, unidad, costo_base, margen_inter_co, precio_inter_co",
      )
      .eq("activo", true)
      .order("codigo"),
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

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/ot"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Órdenes de trabajo
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">Nueva OT inter-co</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trabajo entre empresas del grupo. Empresa origen paga, empresa destino
          presta el servicio. Doble confirmación antes de iniciar.
        </p>
      </div>

      {searchParams?.solicitud_origen && (
        <div className="mb-3 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-[12.5px] text-blue-900">
          Creando OT desde una solicitud aprobada · al guardar, la solicitud
          quedará marcada como <strong>ejecutada</strong> y vinculada a esta OT.
        </div>
      )}

      <OTForm
        empresas={empresas ?? []}
        servicios={(servicios ?? []) as never}
        proyectos={proyectos ?? []}
        empresasOrigenIds={empresasOrigenIds}
        solicitudOrigenId={searchParams?.solicitud_origen ?? null}
        centros={centros}
      />
    </div>
  );
}
