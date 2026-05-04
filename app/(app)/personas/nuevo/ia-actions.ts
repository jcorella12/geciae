"use server";

import {
  empresasDondeGestionaEmpleados,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { validarMedia } from "@/lib/claude/extract";
import { extraerINE } from "@/lib/claude/extractors/ine";

import type { EmpleadoFormDefaults } from "../empleado-form";

export type ProcesarINEResult =
  | {
      ok: true;
      defaults: EmpleadoFormDefaults;
      meta: {
        cache_hit: boolean;
        latencia_ms: number;
        confidence: number;
        costo_usd: number;
      };
    }
  | { ok: false; error: string };

export async function procesarINEEmpleado(
  formData: FormData,
): Promise<ProcesarINEResult> {
  const v = await obtenerVinculos();
  if (empresasDondeGestionaEmpleados(v).length === 0) {
    return {
      ok: false,
      error: "No tienes empresas donde gestionar empleados.",
    };
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

  const result = await extraerINE({
    base64,
    mediaType: file.type as never,
  });

  if (!result.ok) return { ok: false, error: result.error };

  const d = result.data;
  return {
    ok: true,
    defaults: {
      nombre_completo: d.nombre_completo ?? undefined,
      curp: d.curp ?? undefined,
      fecha_nacimiento: d.fecha_nacimiento,
      genero: d.genero,
      domicilio: d.domicilio
        ? {
            calle: d.domicilio.calle ?? null,
            numero_exterior: d.domicilio.numero_exterior ?? null,
            colonia: d.domicilio.colonia ?? null,
            municipio: d.domicilio.municipio ?? null,
            estado: d.domicilio.estado ?? null,
            cp: d.domicilio.cp ?? null,
          }
        : null,
    },
    meta: result.meta,
  };
}
