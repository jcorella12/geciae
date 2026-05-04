"use server";

import { revalidatePath } from "next/cache";

import {
  obtenerVinculos,
  puedeGestionarProveedores,
} from "@/lib/auth/permisos";
import type { DocState } from "@/lib/proveedores/docs";
import { createClient } from "@/lib/supabase/server";

const TIPOS_VALIDOS = [
  "csf",
  "opinion_32d",
  "identificacion_legal",
  "comprobante_domicilio",
  "repse",
  "imss",
  "lista_69b",
  "otro",
] as const;

const SUPPORTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export async function subirDocumentoProveedor(
  proveedorId: string,
  _prev: DocState,
  formData: FormData,
): Promise<DocState> {
  const v = await obtenerVinculos();
  if (!puedeGestionarProveedores(v)) {
    return { ok: false, error: "Sin permiso." };
  }

  const tipo = String(formData.get("tipo_documento") ?? "");
  if (!TIPOS_VALIDOS.includes(tipo as (typeof TIPOS_VALIDOS)[number])) {
    return { ok: false, error: "Tipo de documento inválido." };
  }
  const numero_referencia =
    String(formData.get("numero_referencia") ?? "").trim() || null;
  const observaciones =
    String(formData.get("observaciones") ?? "").trim() || null;
  const fecha_emision =
    String(formData.get("fecha_emision") ?? "").trim() || null;
  const fecha_vencimiento =
    String(formData.get("fecha_vencimiento") ?? "").trim() || null;

  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Adjunta el archivo del documento." };
  }
  if (!SUPPORTED_MIME.includes(file.type)) {
    return {
      ok: false,
      error: `Tipo de archivo no soportado (${file.type}). Usa PDF, JPG, PNG o WEBP.`,
    };
  }
  if (file.size > 10 * 1024 * 1024) {
    return {
      ok: false,
      error: `Archivo de ${(file.size / 1_048_576).toFixed(1)} MB excede 10 MB.`,
    };
  }

  const supabase = createClient();

  // Path: <proveedor_id>/<timestamp>_<safe_name>
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const path = `${proveedorId}/${Date.now()}_${tipo}_${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from("proveedores-docs")
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadErr) {
    return { ok: false, error: `Error al subir: ${uploadErr.message}` };
  }

  const { error: insertErr } = await supabase
    .from("proveedores_documentacion")
    .insert({
      proveedor_id: proveedorId,
      tipo_documento: tipo,
      url_archivo: path,
      fecha_emision,
      fecha_vencimiento,
      numero_referencia,
      observaciones,
      activo: true,
    });

  if (insertErr) {
    // Compensación: borrar el archivo subido para no dejar huérfano.
    await supabase.storage.from("proveedores-docs").remove([path]);
    return { ok: false, error: `Error al registrar: ${insertErr.message}` };
  }

  // El trigger en DB recalcula proveedor.semaforo automáticamente.
  revalidatePath(`/finanzas/proveedores/${proveedorId}/documentacion`);
  revalidatePath(`/finanzas/proveedores/${proveedorId}`);
  revalidatePath("/finanzas/proveedores");
  return { ok: true, error: null };
}

export async function eliminarDocumentoProveedor(
  proveedorId: string,
  documentoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const v = await obtenerVinculos();
  if (!puedeGestionarProveedores(v)) {
    return { ok: false, error: "Sin permiso." };
  }

  const supabase = createClient();

  // Buscar el doc para obtener el path del archivo.
  const { data: doc } = await supabase
    .from("proveedores_documentacion")
    .select("url_archivo")
    .eq("id", documentoId)
    .eq("proveedor_id", proveedorId)
    .maybeSingle();

  if (!doc) return { ok: false, error: "Documento no encontrado." };

  // Borrar archivo del storage (best effort).
  if (doc.url_archivo) {
    await supabase.storage.from("proveedores-docs").remove([doc.url_archivo]);
  }

  // Borrar registro (trigger actualiza semáforo).
  const { error } = await supabase
    .from("proveedores_documentacion")
    .delete()
    .eq("id", documentoId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/finanzas/proveedores/${proveedorId}/documentacion`);
  revalidatePath(`/finanzas/proveedores/${proveedorId}`);
  revalidatePath("/finanzas/proveedores");
  return { ok: true, error: null };
}

export async function validarDocumentoProveedor(
  proveedorId: string,
  documentoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const v = await obtenerVinculos();
  if (!puedeGestionarProveedores(v)) {
    return { ok: false, error: "Sin permiso." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const { error } = await supabase
    .from("proveedores_documentacion")
    .update({
      validado_por: user.id,
      fecha_validacion: new Date().toISOString(),
    })
    .eq("id", documentoId)
    .eq("proveedor_id", proveedorId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/finanzas/proveedores/${proveedorId}/documentacion`);
  return { ok: true, error: null };
}

/** Genera signed URL temporal para descargar/preview del archivo. */
export async function obtenerUrlFirmada(
  path: string,
): Promise<{ url: string | null; error: string | null }> {
  const v = await obtenerVinculos();
  if (v.length === 0) return { url: null, error: "Sin permiso." };

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("proveedores-docs")
    .createSignedUrl(path, 60 * 5); // 5 minutos

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}
