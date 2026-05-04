import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint hook para renderizado externo de PDF.
 *
 * Devuelve un JSON con todos los datos de la cotización ya enriquecidos:
 * cabecera + empresa + cliente + conceptos + totales. Diseñado para ser
 * consumido por el skill de Claude Design (vía HTML→PDF) o cualquier renderer
 * externo (Sunwise, etc.).
 *
 * Queda intencionalmente desacoplado del módulo de cotizaciones: el endpoint
 * solo lee. El renderer decide formato.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();

  const { data: c, error } = await supabase
    .from("cotizaciones")
    .select(
      `
      id, numero, version, fecha_emision, fecha_vencimiento, vigencia_dias,
      subtotal, descuento, iva, retenciones, total,
      condiciones_pago, notas, estado,
      enviada_a_cliente, fecha_envio, vista_por_cliente, fecha_aceptacion,
      aprobada_internamente, origen, created_at,
      empresas (
        id, codigo, razon_social, nombre_comercial, rfc,
        regimen_fiscal, cp_fiscal, direccion_fiscal,
        representante_legal, identidad_visual
      ),
      clientes (
        id, razon_social, nombre_comercial, rfc,
        regimen_fiscal, cp_fiscal, direccion_fiscal,
        uso_cfdi_default, email_facturacion
      )
      `,
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !c) {
    return NextResponse.json(
      { error: error?.message ?? "Cotización no encontrada." },
      { status: 404 },
    );
  }

  const { data: conceptos } = await supabase
    .from("cotizaciones_conceptos")
    .select(
      "id, orden, clave_sat, descripcion, cantidad, unidad_sat, precio_unitario, descuento, importe, iva_tasa, observaciones",
    )
    .eq("cotizacion_id", params.id)
    .order("orden");

  return NextResponse.json({
    cotizacion: {
      id: c.id,
      numero: c.numero,
      version: c.version,
      estado: c.estado,
      fecha_emision: c.fecha_emision,
      fecha_vencimiento: c.fecha_vencimiento,
      vigencia_dias: c.vigencia_dias,
      condiciones_pago: c.condiciones_pago,
      notas: c.notas,
      enviada_a_cliente: c.enviada_a_cliente,
      fecha_envio: c.fecha_envio,
      vista_por_cliente: c.vista_por_cliente,
      fecha_aceptacion: c.fecha_aceptacion,
      aprobada_internamente: c.aprobada_internamente,
      origen: c.origen,
      created_at: c.created_at,
    },
    totales: {
      subtotal: Number(c.subtotal ?? 0),
      descuento: Number(c.descuento ?? 0),
      iva: Number(c.iva ?? 0),
      retenciones: Number(c.retenciones ?? 0),
      total: Number(c.total ?? 0),
    },
    empresa: c.empresas,
    cliente: c.clientes,
    conceptos: (conceptos ?? []).map((cc) => ({
      orden: cc.orden,
      clave_sat: cc.clave_sat,
      descripcion: cc.descripcion,
      cantidad: Number(cc.cantidad),
      unidad_sat: cc.unidad_sat,
      precio_unitario: Number(cc.precio_unitario),
      descuento: Number(cc.descuento ?? 0),
      importe: Number(cc.importe),
      iva_tasa: Number(cc.iva_tasa ?? 0.16),
      iva_monto: Number(cc.importe) * Number(cc.iva_tasa ?? 0.16),
      observaciones: cc.observaciones,
    })),
  });
}
