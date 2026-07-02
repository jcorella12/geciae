import Link from "next/link";
import { redirect } from "next/navigation";

import { empresasDondeCreaOC, obtenerVinculos } from "@/lib/auth/permisos";
import { listarCentrosActivos } from "@/lib/centros/listar";
import { createClient } from "@/lib/supabase/server";

import { OCForm } from "../oc-form";

export default async function NuevaOCPage({
  searchParams,
}: {
  searchParams: { proyecto?: string; solicitud_origen?: string };
}) {
  const vinculos = await obtenerVinculos();
  const empresasIds = empresasDondeCreaOC(vinculos);
  if (empresasIds.length === 0) redirect("/finanzas/oc");

  const supabase = createClient();

  const [
    { data: empresas },
    { data: proveedores },
    { data: proyectos },
    centros,
    { data: empresasTodas },
    { data: cuentas },
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select(
        "id, codigo, razon_social, nombre_comercial, centro_default_gastos_id",
      )
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
    listarCentrosActivos(),
    // Todas las empresas activas del grupo — cualquiera puede ser la pagadora.
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .eq("activa", true)
      .order("codigo"),
    // Catálogo contable para clasificación de contraloría (opcional en el form).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("cuentas_contables")
      .select("clave, descripcion, rubro")
      .eq("activo", true)
      .order("clave"),
  ]);

  const centroDefaultPorEmpresa: Record<string, string | null> = {};
  for (const e of empresas ?? []) {
    centroDefaultPorEmpresa[e.id] =
      (e as { centro_default_gastos_id?: string | null })
        .centro_default_gastos_id ?? null;
  }

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
          href={
            searchParams.proyecto
              ? `/proyectos/${searchParams.proyecto}?tab=solicitudes`
              : "/finanzas/oc"
          }
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {searchParams.proyecto ? "Volver al proyecto" : "Órdenes de compra"}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">Nueva OC</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjunta la cotización o factura y captura lo mínimo: proveedor y
          total. La OC arranca como <strong>borrador</strong>. ¿Necesitas
          desglosar ítem por ítem? Hay un modo detallado abajo.
        </p>
        {searchParams.solicitud_origen && (
          <div className="mt-3 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-[12.5px] text-blue-900">
            Creando OC desde una solicitud aprobada · al guardar, la solicitud
            quedará marcada como <strong>ejecutada</strong> y vinculada a esta OC.
          </div>
        )}
      </div>

      <OCForm
        empresas={empresas ?? []}
        proveedores={proveedores ?? []}
        proyectos={proyectos ?? []}
        centros={centros}
        centroDefaultPorEmpresa={centroDefaultPorEmpresa}
        defaultProyectoId={searchParams.proyecto ?? null}
        defaultEmpresaId={empresaPreseleccionada}
        solicitudOrigenId={searchParams.solicitud_origen ?? null}
        empresasPagadoras={(empresasTodas ?? []) as never}
        cuentas={(cuentas ?? []) as never}
      />
    </div>
  );
}
