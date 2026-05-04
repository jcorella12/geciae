"use server";

import { obtenerVinculos, puedeGestionarProveedores } from "@/lib/auth/permisos";
import { validarMedia } from "@/lib/claude/extract";
import { extraerCSF } from "@/lib/claude/extractors/csf";

import type { ProveedorFormDefaults } from "../proveedor-form";

export type ProcesarCSFResult =
  | {
      ok: true;
      defaults: ProveedorFormDefaults;
      meta: {
        cache_hit: boolean;
        latencia_ms: number;
        confidence: number;
        costo_usd: number;
      };
    }
  | { ok: false; error: string };

export async function procesarCSFProveedor(
  formData: FormData,
): Promise<ProcesarCSFResult> {
  const v = await obtenerVinculos();
  if (!puedeGestionarProveedores(v)) {
    return { ok: false, error: "Sin permiso para gestionar proveedores." };
  }

  const file = formData.get("archivo");
  if (!(file instanceof File)) {
    return { ok: false, error: "Archivo no proporcionado." };
  }
  if (!validarMedia(file.type)) {
    return {
      ok: false,
      error: `Tipo de archivo no soportado (${file.type}). Usa PDF o imagen JPG/PNG/WEBP/GIF.`,
    };
  }
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const result = await extraerCSF({
    base64,
    mediaType: file.type as never,
    modulo: "finanzas",
  });

  if (!result.ok) return { ok: false, error: result.error };

  const d = result.data;
  return {
    ok: true,
    defaults: {
      razon_social: d.razon_social ?? undefined,
      nombre_comercial: d.nombre_comercial ?? null,
      rfc: d.rfc ?? undefined,
      curp: d.curp ?? null,
      regimen_fiscal: d.regimen_fiscal_codigo ?? undefined,
      cp_fiscal: d.cp_fiscal ?? undefined,
      direccion_fiscal: d.domicilio
        ? {
            calle: d.domicilio.calle ?? null,
            numero_exterior: d.domicilio.numero_exterior ?? null,
            numero_interior: d.domicilio.numero_interior ?? null,
            colonia: d.domicilio.colonia ?? null,
            municipio: d.domicilio.municipio ?? null,
            estado: d.domicilio.estado ?? null,
            pais: "México",
          }
        : null,
      representante_legal: d.representante_legal ?? null,
      rfc_representante: d.rfc_representante ?? null,
      semaforo: "verde",
      esta_aprobado: false,
    },
    meta: result.meta,
  };
}
