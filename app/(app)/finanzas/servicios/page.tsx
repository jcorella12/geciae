import { empresasDondeCreaOC, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { ServicioForm } from "./servicio-form";
import { ServiciosList } from "./servicios-list";

export default async function ServiciosPage() {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const empresasIds = empresasDondeCreaOC(vinculos);

  const [{ data: empresas }, { data: servicios }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("catalogo_servicios")
      .select(
        "id, empresa_id, codigo, nombre, descripcion, unidad, costo_base, margen_inter_co, precio_inter_co, precio_externo, activo, empresas(codigo)",
      )
      .order("codigo"),
  ]);

  const empresasGestionables = (empresas ?? []).filter((e) =>
    empresasIds.includes(e.id),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Administración y Finanzas · Catálogos
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Servicios inter-compañías
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Servicios que las empresas del grupo se prestan entre sí (mantenimiento
          solar, certificación, mano de obra, capacitación, etc.). Se usan como
          plantilla al crear OT inter-co.
        </p>
      </div>

      {empresasGestionables.length > 0 && (
        <ServicioForm empresas={empresasGestionables} />
      )}

      <ServiciosList
        servicios={servicios ?? []}
        empresasGestionables={empresasGestionables.map((e) => e.id)}
      />
    </div>
  );
}
