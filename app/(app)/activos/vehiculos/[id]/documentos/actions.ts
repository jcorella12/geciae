"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  initialSimpleVehDocState,
  type SimpleVehDocState,
} from "@/lib/vehiculos-docs/state";

const BUCKET = "vehiculos-archivos";

async function gateVehiculo(
  vehiculoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: v } = await supabase
    .from("vehiculos")
    .select("empresa_id")
    .eq("id", vehiculoId)
    .maybeSingle();
  if (!v) return { ok: false, error: "Vehículo no encontrado" };
  const vinc = await obtenerVinculos();
  const puede =
    esCEO(vinc) || esRolEn(vinc, v.empresa_id, ["director", "operativo"]);
  if (!puede) return { ok: false, error: "Sin permiso." };
  return { ok: true };
}

function safeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
}

export async function subirDocumentoVehiculo(
  _prev: SimpleVehDocState,
  formData: FormData,
): Promise<SimpleVehDocState> {
  const vehiculoId = formData.get("vehiculo_id") as string;
  const file = formData.get("archivo") as File | null;
  const categoria = (formData.get("categoria") as string) || "otro";
  const nombre = (formData.get("nombre") as string) || file?.name || "";
  const descripcion = (formData.get("descripcion") as string) || null;
  const numeroDocumento =
    (formData.get("numero_documento") as string) || null;
  const emisor = (formData.get("emisor") as string) || null;
  const fechaEmision = (formData.get("fecha_emision") as string) || null;
  const fechaVencimiento =
    (formData.get("fecha_vencimiento") as string) || null;
  const montoStr = (formData.get("monto") as string) || "";
  const monto = montoStr ? Number(montoStr) : null;

  if (!vehiculoId)
    return { ...initialSimpleVehDocState, error: "Falta vehículo" };
  if (!file || file.size === 0)
    return {
      ...initialSimpleVehDocState,
      error: "Selecciona un archivo",
    };
  if (file.size > 50 * 1024 * 1024)
    return {
      ...initialSimpleVehDocState,
      error: "Archivo > 50MB no permitido",
    };

  const g = await gateVehiculo(vehiculoId);
  if (!g.ok) return { ...initialSimpleVehDocState, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const userMeta = usr.user?.user_metadata as
    | { full_name?: string; nombre?: string }
    | undefined;
  const userNombre =
    userMeta?.full_name ?? userMeta?.nombre ?? usr.user?.email ?? null;

  const ts = Date.now();
  const path = `${vehiculoId}/${categoria}/${ts}_${safeName(file.name)}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadErr) {
    return {
      ...initialSimpleVehDocState,
      error: `Storage: ${uploadErr.message}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const { error: insertErr } = await supa
    .from("vehiculos_documentos")
    .insert({
      vehiculo_id: vehiculoId,
      categoria,
      nombre: nombre.trim() || file.name,
      descripcion,
      numero_documento: numeroDocumento,
      emisor,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      monto: monto != null && !Number.isNaN(monto) ? monto : null,
      storage_path: path,
      mime_type: file.type || null,
      tamano_bytes: file.size,
      subido_por: usr.user?.id,
      subido_por_nombre: userNombre,
    });

  if (insertErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ...initialSimpleVehDocState, error: insertErr.message };
  }

  revalidatePath(`/activos/vehiculos/${vehiculoId}`);
  return { ok: true, error: null };
}

export async function eliminarDocumentoVehiculo(
  documentoId: string,
  vehiculoId: string,
  storagePath: string,
): Promise<SimpleVehDocState> {
  const g = await gateVehiculo(vehiculoId);
  if (!g.ok) return { ...initialSimpleVehDocState, error: g.error };

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const { error } = await supa
    .from("vehiculos_documentos")
    .delete()
    .eq("id", documentoId);
  if (error) return { ...initialSimpleVehDocState, error: error.message };

  await supabase.storage.from(BUCKET).remove([storagePath]);

  revalidatePath(`/activos/vehiculos/${vehiculoId}`);
  return { ok: true, error: null };
}

export async function getDownloadUrlVehiculo(
  storagePath: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 600);
  if (error) return null;
  return data.signedUrl;
}
