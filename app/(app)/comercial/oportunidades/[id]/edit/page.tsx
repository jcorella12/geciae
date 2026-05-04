import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import type { EstadoOportunidad } from "@/lib/oportunidades/state";
import { createClient } from "@/lib/supabase/server";

import { OportunidadForm } from "../../oportunidad-form";

export default async function EditarOportunidadPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: op } = await supabase
    .from("oportunidades")
    .select(
      "id, empresa_id, cliente_id, vendedor_id, nombre, descripcion, estado, monto_estimado, probabilidad, fuente, fecha_proxima_accion, proxima_accion, fecha_cierre_estimada, observaciones",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!op) notFound();

  const puedeEditar =
    esCEO(v) ||
    tieneAtributo(v, "vendedor") ||
    esRolEn(v, op.empresa_id, ["director", "operativo"]);
  if (!puedeEditar) {
    redirect(`/comercial/oportunidades/${params.id}`);
  }

  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  const [{ data: empresas }, { data: clientes }, { data: vendedoresUE }] =
    await Promise.all([
      supabase
        .from("empresas")
        .select("id, codigo, razon_social, nombre_comercial")
        .in("id", empresasIds)
        .eq("activa", true),
      supabase
        .from("clientes")
        .select("id, razon_social, rfc, nombre_comercial")
        .eq("activo", true)
        .order("razon_social"),
      supabase
        .from("usuarios_empresas")
        .select("usuario_id, atributos")
        .in("empresa_id", empresasIds)
        .eq("activo", true),
    ]);

  const vendedoresIds = Array.from(
    new Set(
      (vendedoresUE ?? [])
        .filter((u) =>
          ((u.atributos ?? []) as string[]).includes("vendedor"),
        )
        .map((u) => u.usuario_id as string),
    ),
  );
  const vendedores = vendedoresIds.map((id) => ({
    id,
    full_name: null,
    email: id.slice(0, 8),
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/comercial/oportunidades/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Oportunidad
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Editar oportunidad
        </h1>
      </div>

      <OportunidadForm
        empresas={empresas ?? []}
        clientes={clientes ?? []}
        vendedores={vendedores}
        oportunidadId={params.id}
        defaults={{
          empresa_id: op.empresa_id,
          cliente_id: op.cliente_id,
          vendedor_id: op.vendedor_id as string | null,
          nombre: op.nombre as string,
          descripcion: op.descripcion as string | null,
          estado: op.estado as EstadoOportunidad,
          monto_estimado: op.monto_estimado as number | null,
          probabilidad: op.probabilidad as number | null,
          fuente: op.fuente as string | null,
          fecha_proxima_accion: op.fecha_proxima_accion as string | null,
          proxima_accion: op.proxima_accion as string | null,
          fecha_cierre_estimada: op.fecha_cierre_estimada as string | null,
          observaciones: op.observaciones as string | null,
        }}
      />
    </div>
  );
}
