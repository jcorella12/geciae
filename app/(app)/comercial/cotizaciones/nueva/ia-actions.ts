"use server";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { validarMedia } from "@/lib/claude/extract";
import { extraerCotizacion } from "@/lib/claude/extractors/cotizacion";

export type ConceptoSugerido = {
  descripcion: string;
  cantidad: number;
  unidad_sat: string | null;
  precio_unitario: number;
  iva_tasa: number;
};

export type CotizacionClienteDefaults = {
  conceptos: ConceptoSugerido[];
  condiciones_pago: string | null;
  total_extraido: number | null;
};

export type CotizacionClienteResult =
  | {
      ok: true;
      defaults: CotizacionClienteDefaults;
      meta: {
        cache_hit: boolean;
        latencia_ms: number;
        confidence: number;
        costo_usd: number;
      };
    }
  | { ok: false; error: string };

/**
 * S3-T5 — Procesa una cotización del cliente o un brief con la lista
 * de partidas y devuelve los conceptos pre-llenables para el formulario
 * de nueva cotización.
 *
 * Reutiliza el extractor `extraerCotizacion` (que ya usa OC nueva).
 * Diferencia: aquí no buscamos proveedor en catálogo — el target del
 * sistema en cotizaciones es un cliente nuestro, no un proveedor.
 */
export async function procesarCotizacionCliente(
  formData: FormData,
): Promise<CotizacionClienteResult> {
  const v = await obtenerVinculos();
  const tienePermiso = v.some(
    (vin) =>
      ["ceo", "director", "operativo"].includes(vin.rol) ||
      vin.atributos.includes("vendedor"),
  );
  if (!tienePermiso) {
    return { ok: false, error: "Sin permiso para usar IA aquí." };
  }

  const file = formData.get("archivo");
  if (!(file instanceof File)) {
    return { ok: false, error: "Archivo no proporcionado." };
  }
  if (!validarMedia(file.type)) {
    return {
      ok: false,
      error: `Tipo no soportado (${file.type}). Usa PDF o imagen JPG/PNG/WEBP.`,
    };
  }
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const result = await extraerCotizacion({
    base64,
    mediaType: file.type as never,
  });

  if (!result.ok) return { ok: false, error: result.error };

  const d = result.data;
  const conceptos: ConceptoSugerido[] = (d.conceptos ?? [])
    .filter(
      (c) =>
        c.descripcion &&
        c.cantidad != null &&
        c.cantidad > 0 &&
        c.precio_unitario != null,
    )
    .map((c) => ({
      descripcion: c.descripcion!.trim(),
      cantidad: Number(c.cantidad),
      unidad_sat: c.unidad ?? null,
      precio_unitario: Number(c.precio_unitario),
      iva_tasa: c.iva_tasa ?? 0.16,
    }));

  return {
    ok: true,
    defaults: {
      conceptos,
      condiciones_pago: d.condiciones_pago ?? null,
      total_extraido: d.total ?? null,
    },
    meta: result.meta,
  };
}
