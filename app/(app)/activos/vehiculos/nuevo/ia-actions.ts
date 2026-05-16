"use server";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { validarMedia } from "@/lib/claude/extract";
import { extraerFacturaVehiculo } from "@/lib/claude/extractors/factura-vehiculo";

export type VehiculoDefaults = {
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  serie: string | null;
  placa: string | null;
  color: string | null;
  tipo: string | null;
  combustible: string | null;
  costo_adquisicion: number | null;
  fecha_adquisicion: string | null;
};

export type FacturaVehiculoResult =
  | {
      ok: true;
      defaults: VehiculoDefaults;
      meta: {
        cache_hit: boolean;
        latencia_ms: number;
        confidence: number;
        costo_usd: number;
      };
    }
  | { ok: false; error: string };

/**
 * S3-T4 — Procesa la factura de un vehículo (PDF o imagen) y devuelve
 * los campos pre-llenables para `/activos/vehiculos/nuevo`.
 */
export async function procesarFacturaVehiculo(
  formData: FormData,
): Promise<FacturaVehiculoResult> {
  const v = await obtenerVinculos();
  const tienePermiso = v.some((vin) =>
    ["ceo", "director", "operativo"].includes(vin.rol),
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

  const result = await extraerFacturaVehiculo(
    base64,
    file.type as never,
  );

  if (!result.ok) return { ok: false, error: result.error };

  const d = result.data;
  return {
    ok: true,
    defaults: {
      marca: d.marca ?? null,
      modelo: d.modelo ?? null,
      anio: d.anio ?? null,
      serie: d.serie ?? null,
      placa: d.placa ?? null,
      color: d.color ?? null,
      tipo: d.tipo ?? null,
      combustible: d.combustible ?? null,
      costo_adquisicion: d.costo_total ?? null,
      fecha_adquisicion: d.fecha_factura ?? null,
    },
    meta: result.meta,
  };
}
