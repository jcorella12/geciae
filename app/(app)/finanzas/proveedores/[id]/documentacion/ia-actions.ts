"use server";

import { revalidatePath } from "next/cache";

import { obtenerVinculos, puedeGestionarProveedores } from "@/lib/auth/permisos";
import { validarMedia } from "@/lib/claude/extract";
import { validar69B } from "@/lib/claude/extractors/lista69b";
import { createClient } from "@/lib/supabase/server";

export type Validar69BResult =
  | {
      ok: true;
      defaults: {
        veredicto: "no_aparece" | "aparece" | "indeterminado";
        rfc_detectado: string | null;
        rfc_proveedor: string;
        coincide_rfc: boolean;
        evidencia: string | null;
        documento_creado: boolean;
        nuevo_semaforo: string | null;
      };
      meta: {
        cache_hit: boolean;
        latencia_ms: number;
        confidence: number;
        costo_usd: number;
      };
    }
  | { ok: false; error: string };

export async function validar69BProveedor(
  proveedorId: string,
  formData: FormData,
): Promise<Validar69BResult> {
  const v = await obtenerVinculos();
  if (!puedeGestionarProveedores(v)) {
    return { ok: false, error: "Sin permiso." };
  }

  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Adjunta la captura/PDF de la consulta SAT." };
  }
  if (!validarMedia(file.type)) {
    return {
      ok: false,
      error: `Tipo no soportado (${file.type}). Usa PDF, JPG, PNG o WEBP.`,
    };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "Archivo > 10 MB." };
  }

  const supabase = createClient();

  // Cargar RFC del proveedor para verificar coincidencia.
  const { data: prov } = await supabase
    .from("proveedores")
    .select("id, rfc, semaforo")
    .eq("id", proveedorId)
    .maybeSingle();
  if (!prov) {
    return { ok: false, error: "Proveedor no encontrado." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const resultado = await validar69B({
    base64,
    mediaType: file.type as never,
  });
  if (!resultado.ok) {
    return { ok: false, error: resultado.error };
  }

  const d = resultado.data;
  const rfcDetectado = d.rfc_consultado?.toUpperCase().trim() ?? null;
  const coincide = rfcDetectado === prov.rfc.toUpperCase().trim();

  let veredicto: "no_aparece" | "aparece" | "indeterminado" = "indeterminado";
  if (d.aparece_en_lista === false) veredicto = "no_aparece";
  else if (d.aparece_en_lista === true) veredicto = "aparece";

  // Si coincide RFC y el modelo dice que NO aparece con confianza alta o media,
  // creamos el doc de validación. Vence en 30 días (re-validar mensualmente).
  let documentoCreado = false;
  let nuevoSemaforo: string | null = null;

  if (
    coincide &&
    veredicto === "no_aparece" &&
    (d.confianza === "alta" || d.confianza === "media")
  ) {
    // Subir el archivo de evidencia
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const path = `${proveedorId}/${Date.now()}_lista_69b_${safeName}`;
    await supabase.storage
      .from("proveedores-docs")
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    const hoy = new Date().toISOString().slice(0, 10);
    const venc = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    await supabase.from("proveedores_documentacion").insert({
      proveedor_id: proveedorId,
      tipo_documento: "lista_69b",
      url_archivo: path,
      fecha_emision: d.fecha_consulta ?? hoy,
      fecha_vencimiento: venc,
      observaciones: `Validado con IA. ${d.evidencia ? `Evidencia: ${d.evidencia}` : ""}`.trim(),
      activo: true,
    });
    documentoCreado = true;
  }

  // Si aparece en la lista con confianza alta, marcar proveedor en negro.
  if (
    coincide &&
    veredicto === "aparece" &&
    d.confianza === "alta" &&
    prov.semaforo !== "negro"
  ) {
    await supabase
      .from("proveedores")
      .update({
        semaforo: "negro",
        observaciones: `MARCADO NEGRO POR LISTA 69-B (${new Date().toISOString().slice(0, 10)}). ${d.evidencia ?? ""}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proveedorId);
    nuevoSemaforo = "negro";
  }

  revalidatePath(`/finanzas/proveedores/${proveedorId}/documentacion`);
  revalidatePath(`/finanzas/proveedores/${proveedorId}`);
  revalidatePath("/finanzas/proveedores");

  return {
    ok: true,
    defaults: {
      veredicto,
      rfc_detectado: rfcDetectado,
      rfc_proveedor: prov.rfc,
      coincide_rfc: coincide,
      evidencia: d.evidencia ?? null,
      documento_creado: documentoCreado,
      nuevo_semaforo: nuevoSemaforo,
    },
    meta: resultado.meta,
  };
}
