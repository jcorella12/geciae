/**
 * Sprint 8.2 — Importa un XML del SAT a la tabla `cfdi`.
 *
 * Reusa el parser existente en `lib/cfdi/parser.ts`. Deduplica por uuid_sat:
 * si ya existe, retorna 'duplicado' sin error.
 */

import { parseCfdiXml, tipoCfdiDb } from "@/lib/cfdi/parser";
import { createClient } from "@/lib/supabase/server";

export type ResultadoImport =
  | { estado: "importado"; cfdiId: string; uuid: string }
  | { estado: "duplicado"; uuid: string }
  | { estado: "error"; mensaje: string };

/**
 * Importa un XML CFDI a la tabla `cfdi`. Determina si es emitido o recibido
 * comparando el RFC del emisor con el RFC de la empresa.
 */
export async function importarXmlACfdi(opts: {
  xmlContent: string;
  empresaId: string;
  rfcEmpresa: string;
  origen: string;
}): Promise<ResultadoImport> {
  const supabase = createClient();

  let parsed;
  try {
    parsed = parseCfdiXml(opts.xmlContent);
  } catch (e) {
    return {
      estado: "error",
      mensaje: e instanceof Error ? e.message : "Error parseando XML",
    };
  }

  if (!parsed.uuid_sat) {
    return { estado: "error", mensaje: "XML sin UUID timbrado" };
  }

  // Deduplicar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existente } = (await (supabase as any)
    .from("cfdi")
    .select("id")
    .eq("uuid_sat", parsed.uuid_sat)
    .maybeSingle()) as unknown as { data: { id: string } | null };

  if (existente) {
    return { estado: "duplicado", uuid: parsed.uuid_sat };
  }

  // ¿Es emitido por nosotros o recibido?
  // El RFC del emisor coincide con la empresa → es_emitido=TRUE
  const rfcEmpresaUp = opts.rfcEmpresa.toUpperCase();
  const esEmitido = parsed.rfc_emisor.toUpperCase() === rfcEmpresaUp;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nueva, error } = (await (supabase as any)
    .from("cfdi")
    .insert({
      empresa_id: opts.empresaId,
      tipo: tipoCfdiDb(parsed.tipo_comprobante),
      es_emitido: esEmitido,
      serie: parsed.serie,
      folio: parsed.folio,
      uuid_sat: parsed.uuid_sat,
      fecha_emision: parsed.fecha_emision,
      fecha_timbrado: parsed.fecha_timbrado,
      rfc_emisor: parsed.rfc_emisor,
      nombre_emisor: parsed.nombre_emisor,
      rfc_receptor: parsed.rfc_receptor,
      nombre_receptor: parsed.nombre_receptor,
      uso_cfdi: parsed.uso_cfdi,
      metodo_pago: parsed.metodo_pago,
      forma_pago: parsed.forma_pago,
      moneda: parsed.moneda ?? "MXN",
      tipo_cambio: parsed.tipo_cambio ?? 1,
      subtotal: parsed.subtotal,
      descuento: parsed.descuento,
      iva_trasladado: parsed.iva_trasladado,
      iva_retenido: parsed.iva_retenido,
      isr_retenido: parsed.isr_retenido,
      total: parsed.total,
      estado: "timbrado",
    })
    .select("id")
    .single()) as unknown as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (error || !nueva) {
    return {
      estado: "error",
      mensaje: error?.message ?? "Error insertando CFDI",
    };
  }

  return { estado: "importado", cfdiId: nueva.id, uuid: parsed.uuid_sat };
}
