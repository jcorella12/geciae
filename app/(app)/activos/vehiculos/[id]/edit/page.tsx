import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { esCEO, esRolEn, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { VehiculoForm } from "../../vehiculo-form";

export default async function EditarVehiculoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: vh } = await supabase
    .from("vehiculos")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!vh) notFound();

  const puede =
    esCEO(v) || esRolEn(v, vh.empresa_id, ["director", "operativo"]);
  if (!puede) redirect(`/activos/vehiculos/${params.id}`);

  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));
  const [{ data: empresas }, { data: gastosRec }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .in("id", empresasIds)
      .eq("activa", true),
    supabase
      .from("gastos_recurrentes")
      .select("id, empresa_id, descripcion, monto")
      .eq("categoria", "arrendamiento_vehiculo")
      .eq("activo", true),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/activos/vehiculos/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Vehículo
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Editar vehículo
        </h1>
      </div>

      <VehiculoForm
        empresas={empresas ?? []}
        gastosRecurrentes={gastosRec ?? []}
        vehiculoId={params.id}
        defaults={{
          empresa_id: vh.empresa_id,
          placa: vh.placa as string | null,
          numero_economico: vh.numero_economico as string | null,
          serie: vh.serie as string | null,
          marca: vh.marca as string,
          modelo: vh.modelo as string,
          anio: vh.anio as number | null,
          color: vh.color as string | null,
          tipo: vh.tipo as string | null,
          uso: vh.uso as string | null,
          combustible: vh.combustible as string | null,
          tipo_propiedad: vh.tipo_propiedad as string,
          fecha_adquisicion: vh.fecha_adquisicion as string | null,
          costo_adquisicion: vh.costo_adquisicion as number | null,
          proveedor_id: vh.proveedor_id as string | null,
          gasto_recurrente_id: vh.gasto_recurrente_id as string | null,
          fecha_termino_contrato: vh.fecha_termino_contrato as string | null,
          estatus: vh.estatus as string,
          km_actual: vh.km_actual as number | null,
          poliza_seguro: vh.poliza_seguro as string | null,
          fecha_vencimiento_seguro: vh.fecha_vencimiento_seguro as string | null,
          asignado_a: vh.asignado_a as string | null,
          observaciones: vh.observaciones as string | null,
        }}
      />
    </div>
  );
}
