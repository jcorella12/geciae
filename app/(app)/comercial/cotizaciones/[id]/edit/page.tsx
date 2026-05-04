import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { CotizacionForm } from "../../cotizacion-form";

export default async function EditarCotizacionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();

  const { data: c } = await supabase
    .from("cotizaciones")
    .select(
      "id, empresa_id, cliente_id, oportunidad_id, fecha_emision, vigencia_dias, descuento, retenciones, condiciones_pago, notas, estado",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!c) notFound();

  // Solo borrador o vencida
  if (!["borrador", "vencida"].includes(c.estado as string)) {
    redirect(`/comercial/cotizaciones/${params.id}`);
  }

  // Permiso
  const puedeEditar =
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "vendedor") ||
    esRolEn(vinculos, c.empresa_id, ["director", "operativo"]);
  if (!puedeEditar) {
    redirect(`/comercial/cotizaciones/${params.id}`);
  }

  const { data: conceptos } = await supabase
    .from("cotizaciones_conceptos")
    .select("*")
    .eq("cotizacion_id", params.id)
    .order("orden");

  const [{ data: empresas }, { data: clientes }, { data: oportunidades }] =
    await Promise.all([
      supabase
        .from("empresas")
        .select("id, codigo, razon_social, nombre_comercial")
        .eq("id", c.empresa_id),
      supabase
        .from("clientes")
        .select("id, razon_social, rfc, nombre_comercial")
        .eq("activo", true)
        .order("razon_social"),
      supabase
        .from("oportunidades")
        .select("id, nombre, empresa_id, cliente_id, estado")
        .eq("empresa_id", c.empresa_id)
        .order("nombre"),
    ]);

  const defaults: Parameters<typeof CotizacionForm>[0]["defaults"] = {
    empresa_id: c.empresa_id,
    cliente_id: c.cliente_id,
    oportunidad_id: c.oportunidad_id,
    fecha_emision: c.fecha_emision as string,
    vigencia_dias: c.vigencia_dias ?? 30,
    descuento_global: c.descuento ?? 0,
    retenciones: c.retenciones ?? 0,
    condiciones_pago: c.condiciones_pago,
    notas: c.notas,
    conceptos: (conceptos ?? []).map((cc) => ({
      descripcion: cc.descripcion as string,
      cantidad: cc.cantidad as number,
      unidad_sat: cc.unidad_sat as string | null,
      precio_unitario: cc.precio_unitario as number,
      descuento: cc.descuento as number,
      iva_tasa: cc.iva_tasa as number,
      clave_sat: cc.clave_sat as string | null,
      observaciones: cc.observaciones as string | null,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/comercial/cotizaciones/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Cotización
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Editar cotización
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo se editan borradores o cotizaciones vencidas. Al guardar, el
          sistema recalcula los totales.
        </p>
      </div>

      <CotizacionForm
        empresas={empresas ?? []}
        clientes={clientes ?? []}
        oportunidades={oportunidades ?? []}
        cotizacionId={params.id}
        defaults={defaults}
      />
    </div>
  );
}
