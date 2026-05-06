import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { VehiculoForm } from "../vehiculo-form";

export default async function NuevoVehiculoPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));
  const [{ data: empresas }, { data: gastosRec }, { data: empleados }] =
    await Promise.all([
      supabase
        .from("empresas")
        .select("id, codigo, razon_social, nombre_comercial")
        .in("id", empresasIds)
        .eq("activa", true)
        .order("codigo"),
      supabase
        .from("gastos_recurrentes")
        .select("id, empresa_id, descripcion, monto")
        .eq("categoria", "arrendamiento_vehiculo")
        .eq("activo", true)
        .order("descripcion"),
      supabase
        .from("empleados")
        .select("id, empresa_id, nombre_completo, puesto")
        .in("empresa_id", empresasIds)
        .eq("activo", true)
        .order("nombre_completo"),
    ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/activos/vehiculos"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Vehículos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Nuevo vehículo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Captura una unidad propia o arrendada. Si es arrendado, vincula con
          el gasto recurrente correspondiente.
        </p>
      </div>

      <VehiculoForm
        empresas={empresas ?? []}
        gastosRecurrentes={gastosRec ?? []}
        empleados={empleados ?? []}
      />
    </div>
  );
}
