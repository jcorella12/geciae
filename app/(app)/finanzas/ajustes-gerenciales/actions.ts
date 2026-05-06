"use server";

/**
 * Sprint S.1 — Server actions de Ajustes Gerenciales.
 *
 * Permisos: solo CEO + atributo contralor + atributo tesorero_corporativo.
 * Cada acción registra entrada en ajustes_gerenciales_audit.
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  ActualizarAjusteSchema,
  AgregarDocumentoSchema,
  CambiarEstadoSchema,
  CancelarAjusteSchema,
  CrearAjusteSchema,
  RegularizarAjusteSchema,
} from "@/lib/ajustes-gerenciales/schemas";
import {
  NATURALEZA_POR_TIPO,
  type AccionAuditAjuste,
  type AjusteGerencial,
  type DocumentoAjuste,
  type EstadoAjusteGerencial,
} from "@/lib/ajustes-gerenciales/state";
import { createClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

async function exigirPermiso(): Promise<{ userId: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puede, error } = await (supabase as any).rpc(
    "usuario_puede_ver_ajustes_gerenciales",
  );
  if (error) throw new Error(error.message);
  if (!puede) {
    throw new Error(
      "Sin permisos. Solo CEO + contralor + tesorero corporativo pueden gestionar ajustes gerenciales.",
    );
  }
  return { userId: user.id };
}

async function registrarAuditoria(
  accion: AccionAuditAjuste,
  ajusteId: string | null,
  detalles?: Record<string, unknown>,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const h = headers();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("ajustes_gerenciales_audit").insert({
    usuario_id: user.id,
    accion,
    ajuste_id: ajusteId,
    detalles: detalles ?? null,
    ip_address: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null,
    user_agent: h.get("user-agent") ?? null,
  });
}

function fdGet(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  if (v === null || v === undefined) return undefined;
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? undefined : s;
}

function fdNum(fd: FormData, key: string): number | undefined {
  const v = fdGet(fd, key);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// ----------------------------------------------------------------------------
// CRUD
// ----------------------------------------------------------------------------

export type ResultadoAccion =
  | { ok: true; data?: { id: string; codigo: string } }
  | { ok: false; error: string };

export async function crearAjuste(formData: FormData): Promise<ResultadoAccion> {
  try {
    const { userId } = await exigirPermiso();
    const supabase = createClient();

    const datos = CrearAjusteSchema.parse({
      empresa_id: fdGet(formData, "empresa_id"),
      tipo: fdGet(formData, "tipo"),
      descripcion: fdGet(formData, "descripcion"),
      valor: fdNum(formData, "valor"),
      fecha_adquisicion: fdGet(formData, "fecha_adquisicion"),
      vida_util_anios: fdNum(formData, "vida_util_anios") ?? null,
      valor_residual_pct: fdNum(formData, "valor_residual_pct") ?? 10,
      justificacion: fdGet(formData, "justificacion"),
      oc_origen_id: fdGet(formData, "oc_origen_id") ?? null,
      cfdi_origen_id: fdGet(formData, "cfdi_origen_id") ?? null,
      observaciones_origen: fdGet(formData, "observaciones_origen") ?? null,
      contraparte_nombre: fdGet(formData, "contraparte_nombre") ?? null,
      contraparte_relacion: fdGet(formData, "contraparte_relacion") ?? null,
      observaciones: fdGet(formData, "observaciones") ?? null,
    });

    const naturaleza = NATURALEZA_POR_TIPO[datos.tipo];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("ajustes_gerenciales")
      .insert({
        ...datos,
        naturaleza,
        registrado_por: userId,
        estado: "borrador",
      })
      .select("id, codigo")
      .single();

    if (error) return { ok: false, error: error.message };

    await registrarAuditoria("crear", data.id, {
      tipo: datos.tipo,
      valor: datos.valor,
      empresa_id: datos.empresa_id,
    });

    revalidatePath("/finanzas/ajustes-gerenciales");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function cambiarEstadoAjuste(
  id: string,
  estado: "borrador" | "vigente",
): Promise<ResultadoAccion> {
  try {
    const { userId } = await exigirPermiso();
    CambiarEstadoSchema.parse({ id, estado });

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("ajustes_gerenciales")
      .update({ estado, modificado_por: userId })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };

    await registrarAuditoria("actualizar", id, { nuevo_estado: estado });
    revalidatePath("/finanzas/ajustes-gerenciales");
    revalidatePath(`/finanzas/ajustes-gerenciales/${id}`);
    revalidatePath("/finanzas/vista-real");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function actualizarAjuste(formData: FormData): Promise<ResultadoAccion> {
  try {
    const { userId } = await exigirPermiso();

    const obj: Record<string, unknown> = {
      id: fdGet(formData, "id"),
      motivo_cambio: fdGet(formData, "motivo_cambio"),
    };
    // Campos opcionales (sólo enviar los que vengan)
    const opcionales = [
      "descripcion",
      "valor",
      "fecha_adquisicion",
      "vida_util_anios",
      "valor_residual_pct",
      "justificacion",
      "observaciones_origen",
      "contraparte_nombre",
      "contraparte_relacion",
      "observaciones",
    ] as const;
    for (const k of opcionales) {
      const v = fdGet(formData, k);
      if (v === undefined) continue;
      if (k === "valor" || k === "vida_util_anios" || k === "valor_residual_pct") {
        const n = Number(v);
        if (Number.isFinite(n)) obj[k] = n;
      } else {
        obj[k] = v;
      }
    }

    const datos = ActualizarAjusteSchema.parse(obj);
    const { id, motivo_cambio, ...campos } = datos;

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("ajustes_gerenciales")
      .update({ ...campos, modificado_por: userId })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };

    await registrarAuditoria("actualizar", id, { motivo: motivo_cambio });
    revalidatePath(`/finanzas/ajustes-gerenciales/${id}`);
    revalidatePath("/finanzas/ajustes-gerenciales");
    revalidatePath("/finanzas/vista-real");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function cancelarAjuste(
  id: string,
  motivo: string,
): Promise<ResultadoAccion> {
  try {
    const { userId } = await exigirPermiso();
    const datos = CancelarAjusteSchema.parse({ id, motivo });

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("ajustes_gerenciales")
      .update({
        estado: "cancelado",
        modificado_por: userId,
        observaciones: `CANCELADO: ${datos.motivo}`,
      })
      .eq("id", datos.id);

    if (error) return { ok: false, error: error.message };

    await registrarAuditoria("cancelar", datos.id, { motivo: datos.motivo });
    revalidatePath("/finanzas/ajustes-gerenciales");
    revalidatePath(`/finanzas/ajustes-gerenciales/${datos.id}`);
    revalidatePath("/finanzas/vista-real");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function regularizarAjuste(
  formData: FormData,
): Promise<ResultadoAccion> {
  try {
    const { userId } = await exigirPermiso();

    const datos = RegularizarAjusteSchema.parse({
      id: fdGet(formData, "id"),
      fecha_regularizacion: fdGet(formData, "fecha_regularizacion"),
      observaciones: fdGet(formData, "observaciones"),
    });

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("ajustes_gerenciales")
      .update({
        estado: "regularizado",
        regularizado_fecha: datos.fecha_regularizacion,
        regularizado_observaciones: datos.observaciones,
        modificado_por: userId,
      })
      .eq("id", datos.id);

    if (error) return { ok: false, error: error.message };

    await registrarAuditoria("regularizar", datos.id, { ...datos });
    revalidatePath(`/finanzas/ajustes-gerenciales/${datos.id}`);
    revalidatePath("/finanzas/ajustes-gerenciales");
    revalidatePath("/finanzas/vista-real");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function agregarDocumento(
  formData: FormData,
): Promise<ResultadoAccion> {
  try {
    const { userId } = await exigirPermiso();
    const supabase = createClient();

    const archivo = formData.get("archivo");
    if (!(archivo instanceof File)) {
      return { ok: false, error: "Archivo requerido" };
    }

    const ajusteId = String(formData.get("ajuste_id"));
    const meta = AgregarDocumentoSchema.parse({
      ajuste_id: ajusteId,
      tipo_documento: fdGet(formData, "tipo_documento"),
      nombre: fdGet(formData, "nombre") ?? archivo.name,
      fecha_documento: fdGet(formData, "fecha_documento") ?? null,
      observaciones: fdGet(formData, "observaciones") ?? null,
    });

    const ext = archivo.name.split(".").pop() ?? "bin";
    const filename = `${ajusteId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("ajustes-gerenciales-docs")
      .upload(filename, archivo, {
        contentType: archivo.type || "application/octet-stream",
      });
    if (upErr) return { ok: false, error: upErr.message };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("ajustes_gerenciales_documentos")
      .insert({
        ajuste_id: ajusteId,
        tipo_documento: meta.tipo_documento,
        nombre: meta.nombre,
        url: filename,
        fecha_documento: meta.fecha_documento ?? null,
        observaciones: meta.observaciones ?? null,
        subido_por: userId,
      });
    if (error) return { ok: false, error: error.message };

    await registrarAuditoria("agregar_documento", ajusteId, {
      archivo: archivo.name,
      tipo_documento: meta.tipo_documento,
    });
    revalidatePath(`/finanzas/ajustes-gerenciales/${ajusteId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarDocumento(
  documentoId: string,
  ajusteId: string,
): Promise<ResultadoAccion> {
  try {
    await exigirPermiso();
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: doc } = (await (supabase as any)
      .from("ajustes_gerenciales_documentos")
      .select("url")
      .eq("id", documentoId)
      .single()) as unknown as { data: { url: string } | null };

    if (doc?.url) {
      await supabase.storage.from("ajustes-gerenciales-docs").remove([doc.url]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("ajustes_gerenciales_documentos")
      .delete()
      .eq("id", documentoId);
    if (error) return { ok: false, error: error.message };

    await registrarAuditoria("eliminar_documento", ajusteId, { documento_id: documentoId });
    revalidatePath(`/finanzas/ajustes-gerenciales/${ajusteId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ----------------------------------------------------------------------------
// Lecturas
// ----------------------------------------------------------------------------

export async function listarAjustes(filtros?: {
  empresa_id?: string;
  tipo?: string;
  estado?: EstadoAjusteGerencial | string;
}): Promise<AjusteGerencial[]> {
  await exigirPermiso();
  await registrarAuditoria("visualizacion_lista", null, filtros ?? {});

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("v_ajustes_gerenciales_enriquecido")
    .select("*")
    .order("fecha_adquisicion", { ascending: false });

  if (filtros?.empresa_id) q = q.eq("empresa_id", filtros.empresa_id);
  if (filtros?.tipo) q = q.eq("tipo", filtros.tipo);
  if (filtros?.estado) q = q.eq("estado", filtros.estado);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as AjusteGerencial[];
}

export async function obtenerAjuste(id: string): Promise<{
  ajuste: AjusteGerencial;
  documentos: DocumentoAjuste[];
}> {
  await exigirPermiso();
  await registrarAuditoria("visualizacion_detalle", id);

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ajuste, error } = await (supabase as any)
    .from("v_ajustes_gerenciales_enriquecido")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: docs } = await (supabase as any)
    .from("ajustes_gerenciales_documentos")
    .select("*")
    .eq("ajuste_id", id)
    .order("created_at", { ascending: false });

  return {
    ajuste: ajuste as AjusteGerencial,
    documentos: (docs ?? []) as DocumentoAjuste[],
  };
}

/** URL firmada para descargar un documento (válida 60s). */
export async function obtenerUrlDocumento(
  url: string,
): Promise<{ url: string } | { error: string }> {
  await exigirPermiso();
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("ajustes-gerenciales-docs")
    .createSignedUrl(url, 60);
  if (error || !data) return { error: error?.message ?? "Error" };
  return { url: data.signedUrl };
}
