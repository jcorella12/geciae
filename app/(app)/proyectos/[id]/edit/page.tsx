import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  empresasDondeGestionaProyectos,
  obtenerVinculos,
  puedeGestionarProyectosEn,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { ProyectoForm } from "../../proyecto-form";

export default async function EditProyectoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();

  const { data: p } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!p) notFound();

  if (!puedeGestionarProyectosEn(vinculos, p.empresa_id)) {
    redirect(`/proyectos/${p.id}`);
  }

  const empresasIds = empresasDondeGestionaProyectos(vinculos);
  const [{ data: empresas }, { data: clientes }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .in("id", empresasIds.length ? empresasIds : [p.empresa_id])
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
          href={`/proyectos/${p.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {p.nombre}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Editar proyecto
        </h1>
      </div>

      <ProyectoForm
        empresas={empresas ?? []}
        clientes={clientes ?? []}
        proyectoId={p.id}
        defaults={{
          empresa_id: p.empresa_id,
          cliente_id: p.cliente_id,
          codigo: p.codigo,
          nombre: p.nombre,
          descripcion: p.descripcion,
          tipo: p.tipo,
          estado: p.estado ?? "cotizacion",
          fecha_contrato: p.fecha_contrato,
          fecha_inicio_planeado: p.fecha_inicio_planeado,
          fecha_fin_planeado: p.fecha_fin_planeado,
          monto_contratado:
            p.monto_contratado != null ? Number(p.monto_contratado) : null,
          presupuesto_costo:
            p.presupuesto_costo != null ? Number(p.presupuesto_costo) : null,
          capacidad_kwp:
            p.capacidad_kwp != null ? Number(p.capacidad_kwp) : null,
          observaciones: p.observaciones,
        }}
      />
    </div>
  );
}
