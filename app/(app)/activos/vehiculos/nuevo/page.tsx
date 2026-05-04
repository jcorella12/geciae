import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { VehiculoForm } from "../vehiculo-form";

export default async function NuevoVehiculoPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const [{ data: empresas }, { data: gastosRec }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .in("id", empresasIds)
      .eq("activa", true)
      .order("codigo"),
    supa
      .from("gastos_recurrentes")
      .select("id, empresa_id, descripcion, monto")
      .eq("categoria", "arrendamiento_vehiculo")
      .eq("activo", true)
      .order("descripcion"),
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
      />
    </div>
  );
}
