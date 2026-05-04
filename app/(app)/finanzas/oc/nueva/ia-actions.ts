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

export type CotizacionDefaults = {
  proveedor: {
    razon_social: string | null;
    rfc: string | null;
    /** UUID del proveedor en catálogo si encontró match por RFC */
    id: string | null;
    /** True si el RFC venía pero NO se encontró en catálogo */
    no_encontrado: boolean;
  };
  conceptos: ConceptoSugerido[];
  condiciones_pago: string | null;
  total_cotizacion: number | null;
};

export type CotizacionActionResult =
  | {
      ok: true;
      defaults: CotizacionDefaults;
      meta: {
        cache_hit: boolean;
        latencia_ms: number;
        confidence: number;
        costo_usd: number;
      };
    }
  | { ok: false; error: string };

export async function procesarCotizacionOC(
  formData: FormData,
): Promise<CotizacionActionResult> {
  const v = await obtenerVinculos();
  const tienePermiso = v.some((vin) =>
    ["ceo", "director", "operativo"].includes(vin.rol),
  );
  if (!tienePermiso) {
    return { ok: false, error: "Sin permiso para usar IA en OC." };
  }

  const file = formData.get("archivo");
  if (!(file instanceof File)) {
    return { ok: false, error: "Archivo no proporcionado." };
  }
  if (!validarMedia(file.type)) {
    return {
      ok: false,
      error: `Tipo no soportado (${file.type}). Usa PDF o imagen JPG/PNG/WEBP/GIF.`,
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

  // Resolver proveedor por RFC contra catálogo.
  let proveedorId: string | null = null;
  let noEncontrado = false;
  if (d.proveedor?.rfc) {
    const rfcUpper = d.proveedor.rfc.toUpperCase().trim();
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: prov } = await supabase
      .from("proveedores")
      .select("id, semaforo")
      .eq("rfc", rfcUpper)
      .eq("activo", true)
      .maybeSingle();
    if (prov && prov.semaforo !== "rojo" && prov.semaforo !== "negro") {
      proveedorId = prov.id;
    } else {
      noEncontrado = true;
    }
  }

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
      proveedor: {
        razon_social: d.proveedor?.razon_social ?? null,
        rfc: d.proveedor?.rfc ? d.proveedor.rfc.toUpperCase().trim() : null,
        id: proveedorId,
        no_encontrado: noEncontrado,
      },
      conceptos,
      condiciones_pago: d.condiciones_pago ?? null,
      total_cotizacion: d.total ?? null,
    },
    meta: result.meta,
  };
}
