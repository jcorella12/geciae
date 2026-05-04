"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { clasificarDocumento, safeFilename } from "@/lib/efm/clasificador";
import { extraerKPIsIA } from "@/lib/efm/extractor-ia";
import {
  ActualizarKPIsManualSchema,
  ActualizarObservacionesEFMSchema,
  EliminarDocumentoSchema,
  MarcarFirmadosSchema,
  SubirDocumentoIndividualSchema,
  SubirPaqueteSchema,
} from "@/lib/efm/schemas";
import {
  initialEFMState,
  initialExtraerKPIsState,
  initialSimpleEFMState,
  initialSubirPaqueteState,
  TIPOS_DOC_EFM,
  type EFMState,
  type ExtraerKPIsState,
  type SimpleEFMState,
  type SubirPaqueteState,
  type TipoDocEFM,
} from "@/lib/efm/state";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "estados-financieros";

async function gateEFMEmpresa(
  empresaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    esRolEn(v, empresaId, ["director", "operativo"]);
  if (!puede)
    return {
      ok: false,
      error: "Sin permiso para gestionar estados financieros de esta empresa.",
    };
  return { ok: true };
}

async function gateEFM(
  efmId: string,
): Promise<
  | { ok: true; empresaId: string; efm: { documentos: Record<string, string> } }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("estados_financieros_mensuales")
    .select("empresa_id, documentos")
    .eq("id", efmId)
    .maybeSingle();
  if (!data) return { ok: false, error: "EFM no encontrado." };
  const g = await gateEFMEmpresa(data.empresa_id);
  if (!g.ok) return { ok: false, error: g.error };
  return {
    ok: true,
    empresaId: data.empresa_id,
    efm: { documentos: (data.documentos ?? {}) as Record<string, string> },
  };
}

// ============================================================================
// Crear paquete vacío (la subida real va aparte)
// ============================================================================
export async function crearPaqueteMensual(
  _prev: EFMState,
  formData: FormData,
): Promise<EFMState> {
  const parsed = SubirPaqueteSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    anio: formData.get("anio"),
    mes: formData.get("mes"),
  });
  if (!parsed.success)
    return { ...initialEFMState, error: "Datos inválidos." };
  const { empresa_id, anio, mes } = parsed.data;
  const g = await gateEFMEmpresa(empresa_id);
  if (!g.ok) return { ...initialEFMState, error: g.error };

  const supabase = createClient();
  // Si ya existe, lo devolvemos
  const { data: existe } = await supabase
    .from("estados_financieros_mensuales")
    .select("id")
    .eq("empresa_id", empresa_id)
    .eq("anio", anio)
    .eq("mes", mes)
    .maybeSingle();
  if (existe) {
    return { ok: true, error: null, efmId: existe.id };
  }

  const { data: usr } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("estados_financieros_mensuales")
    .insert({
      empresa_id,
      anio,
      mes,
      documentos: {},
      num_documentos: 0,
      paquete_completo: false,
      firmados: false,
      subido_por: usr.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !data)
    return { ...initialEFMState, error: error?.message ?? "Error al crear" };

  revalidatePath("/finanzas/estados-financieros");
  return { ok: true, error: null, efmId: data.id };
}

// ============================================================================
// Subir múltiples documentos con auto-clasificación
// ============================================================================
async function subirYClasificar(
  empresaId: string,
  efmId: string,
  anio: number,
  mes: number,
  archivos: File[],
): Promise<{
  ok: boolean;
  error: string | null;
  subidos: number;
  noClasificados: string[];
  documentos: Record<string, string>;
}> {
  const supabase = createClient();
  const noClasificados: string[] = [];
  let subidos = 0;
  let totalSize = 0;
  const docs: Record<string, string> = {};

  for (const file of archivos) {
    if (file.size === 0) continue;
    if (file.size > 50 * 1024 * 1024) {
      // Saltar > 50MB
      noClasificados.push(`${file.name} (>50MB)`);
      continue;
    }
    const tipo = clasificarDocumento(file.name);
    if (!tipo) {
      noClasificados.push(file.name);
      continue;
    }
    const path = `${empresaId}/${anio}-${String(mes).padStart(2, "0")}/${tipo}.pdf`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type || "application/pdf",
        upsert: true, // re-subir reemplaza el doc
      });
    if (upErr) {
      noClasificados.push(`${file.name} (${upErr.message})`);
      continue;
    }
    docs[tipo] = path;
    subidos++;
    totalSize += file.size;
  }

  // Merge con documentos previos
  const { data: prev } = await supabase
    .from("estados_financieros_mensuales")
    .select("documentos, total_size_bytes")
    .eq("id", efmId)
    .maybeSingle();
  const prevDocs = ((prev?.documentos ?? {}) as Record<string, string>);
  const merged = { ...prevDocs, ...docs };
  const numDocs = Object.keys(merged).length;
  const completo = TIPOS_DOC_EFM.every((k) => merged[k]);

  const { error } = await supabase
    .from("estados_financieros_mensuales")
    .update({
      documentos: merged,
      num_documentos: numDocs,
      total_size_bytes: (prev?.total_size_bytes ?? 0) + totalSize,
      paquete_completo: completo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", efmId);
  if (error)
    return {
      ok: false,
      error: error.message,
      subidos,
      noClasificados,
      documentos: merged,
    };

  return { ok: true, error: null, subidos, noClasificados, documentos: merged };
}

export async function subirDocumentos(
  _prev: SubirPaqueteState,
  formData: FormData,
): Promise<SubirPaqueteState> {
  const efmId = formData.get("efm_id") as string;
  if (!efmId)
    return { ...initialSubirPaqueteState, error: "Falta paquete." };

  const g = await gateEFM(efmId);
  if (!g.ok) return { ...initialSubirPaqueteState, error: g.error };

  const supabase = createClient();
  const { data: efm } = await supabase
    .from("estados_financieros_mensuales")
    .select("empresa_id, anio, mes")
    .eq("id", efmId)
    .single();
  if (!efm)
    return { ...initialSubirPaqueteState, error: "EFM no encontrado." };

  const archivos = formData.getAll("archivos") as File[];
  if (archivos.length === 0)
    return {
      ...initialSubirPaqueteState,
      error: "Selecciona al menos un archivo.",
    };

  const res = await subirYClasificar(
    efm.empresa_id,
    efmId,
    efm.anio,
    efm.mes,
    archivos,
  );
  if (!res.ok)
    return {
      ok: false,
      error: res.error,
      subidos: res.subidos,
      noClasificados: res.noClasificados,
    };

  revalidatePath(`/finanzas/estados-financieros/${efmId}`);
  revalidatePath("/finanzas/estados-financieros");
  return {
    ok: true,
    error: null,
    efmId,
    subidos: res.subidos,
    noClasificados: res.noClasificados,
  };
}

/**
 * Subir un PDF a un tipo_doc específico (override del clasificador). Útil
 * cuando el auto-clasificador falla y el usuario quiere asignar manualmente.
 */
export async function subirDocumentoIndividual(
  _prev: SimpleEFMState,
  formData: FormData,
): Promise<SimpleEFMState> {
  const parsed = SubirDocumentoIndividualSchema.safeParse({
    efm_id: formData.get("efm_id"),
    tipo_doc: formData.get("tipo_doc"),
  });
  if (!parsed.success)
    return { ...initialSimpleEFMState, error: "Datos inválidos." };
  const file = formData.get("archivo") as File | null;
  if (!file || file.size === 0)
    return { ...initialSimpleEFMState, error: "Selecciona un PDF." };
  if (file.size > 50 * 1024 * 1024)
    return { ...initialSimpleEFMState, error: "Archivo > 50MB." };
  if (file.type !== "application/pdf")
    return { ...initialSimpleEFMState, error: "Solo se aceptan PDFs." };

  const g = await gateEFM(parsed.data.efm_id);
  if (!g.ok) return { ...initialSimpleEFMState, error: g.error };

  const supabase = createClient();
  const { data: efm } = await supabase
    .from("estados_financieros_mensuales")
    .select("empresa_id, anio, mes, documentos, total_size_bytes")
    .eq("id", parsed.data.efm_id)
    .single();
  if (!efm)
    return { ...initialSimpleEFMState, error: "EFM no encontrado." };

  const path = `${efm.empresa_id}/${efm.anio}-${String(efm.mes).padStart(2, "0")}/${parsed.data.tipo_doc}.pdf`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr)
    return { ...initialSimpleEFMState, error: upErr.message };

  const docs = { ...((efm.documentos ?? {}) as Record<string, string>) };
  docs[parsed.data.tipo_doc] = path;
  const completo = TIPOS_DOC_EFM.every((k) => docs[k]);

  const { error } = await supabase
    .from("estados_financieros_mensuales")
    .update({
      documentos: docs,
      num_documentos: Object.keys(docs).length,
      total_size_bytes: (efm.total_size_bytes ?? 0) + file.size,
      paquete_completo: completo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.efm_id);
  if (error) return { ...initialSimpleEFMState, error: error.message };

  revalidatePath(`/finanzas/estados-financieros/${parsed.data.efm_id}`);
  return { ok: true, error: null };
}

export async function eliminarDocumento(
  efmId: string,
  tipoDoc: TipoDocEFM,
): Promise<SimpleEFMState> {
  const parsed = EliminarDocumentoSchema.safeParse({
    efm_id: efmId,
    tipo_doc: tipoDoc,
  });
  if (!parsed.success)
    return { ...initialSimpleEFMState, error: "Datos inválidos." };

  const g = await gateEFM(efmId);
  if (!g.ok) return { ...initialSimpleEFMState, error: g.error };

  const supabase = createClient();
  const docs = { ...g.efm.documentos };
  const path = docs[tipoDoc];
  if (path) {
    await supabase.storage.from(BUCKET).remove([path]);
    delete docs[tipoDoc];
  }
  const completo = TIPOS_DOC_EFM.every((k) => docs[k]);
  const { error } = await supabase
    .from("estados_financieros_mensuales")
    .update({
      documentos: docs,
      num_documentos: Object.keys(docs).length,
      paquete_completo: completo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", efmId);
  if (error) return { ...initialSimpleEFMState, error: error.message };
  revalidatePath(`/finanzas/estados-financieros/${efmId}`);
  return { ok: true, error: null };
}

export async function getDownloadUrlEFM(
  storagePath: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 600);
  if (error) return null;
  return data.signedUrl;
}

// ============================================================================
// Marcar firmados / observaciones / KPIs manuales
// ============================================================================
export async function marcarFirmados(
  _prev: SimpleEFMState,
  formData: FormData,
): Promise<SimpleEFMState> {
  const parsed = MarcarFirmadosSchema.safeParse({
    efm_id: formData.get("efm_id"),
    firmados: formData.get("firmados") === "true" || formData.get("firmados") === "on",
  });
  if (!parsed.success)
    return { ...initialSimpleEFMState, error: "Datos inválidos." };
  const g = await gateEFM(parsed.data.efm_id);
  if (!g.ok) return { ...initialSimpleEFMState, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("estados_financieros_mensuales")
    .update({
      firmados: parsed.data.firmados,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.efm_id);
  if (error) return { ...initialSimpleEFMState, error: error.message };
  revalidatePath(`/finanzas/estados-financieros/${parsed.data.efm_id}`);
  return { ok: true, error: null };
}

export async function actualizarObservacionesEFM(
  _prev: SimpleEFMState,
  formData: FormData,
): Promise<SimpleEFMState> {
  const parsed = ActualizarObservacionesEFMSchema.safeParse({
    efm_id: formData.get("efm_id"),
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success)
    return { ...initialSimpleEFMState, error: "Texto inválido." };
  const g = await gateEFM(parsed.data.efm_id);
  if (!g.ok) return { ...initialSimpleEFMState, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("estados_financieros_mensuales")
    .update({
      observaciones: parsed.data.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.efm_id);
  if (error) return { ...initialSimpleEFMState, error: error.message };
  revalidatePath(`/finanzas/estados-financieros/${parsed.data.efm_id}`);
  return { ok: true, error: null };
}

export async function actualizarKPIsManual(
  _prev: SimpleEFMState,
  formData: FormData,
): Promise<SimpleEFMState> {
  const parsed = ActualizarKPIsManualSchema.safeParse({
    efm_id: formData.get("efm_id"),
    utilidad_neta: formData.get("utilidad_neta") || null,
    ingresos_totales: formData.get("ingresos_totales") || null,
    egresos_totales: formData.get("egresos_totales") || null,
    iva_trasladado: formData.get("iva_trasladado") || null,
    iva_acreditable: formData.get("iva_acreditable") || null,
    flujo_efectivo: formData.get("flujo_efectivo") || null,
  });
  if (!parsed.success)
    return { ...initialSimpleEFMState, error: "Valores inválidos." };
  const g = await gateEFM(parsed.data.efm_id);
  if (!g.ok) return { ...initialSimpleEFMState, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("estados_financieros_mensuales")
    .update({
      utilidad_neta: parsed.data.utilidad_neta,
      ingresos_totales: parsed.data.ingresos_totales,
      egresos_totales: parsed.data.egresos_totales,
      iva_trasladado: parsed.data.iva_trasladado,
      iva_acreditable: parsed.data.iva_acreditable,
      flujo_efectivo: parsed.data.flujo_efectivo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.efm_id);
  if (error) return { ...initialSimpleEFMState, error: error.message };
  revalidatePath(`/finanzas/estados-financieros/${parsed.data.efm_id}`);
  return { ok: true, error: null };
}

// ============================================================================
// Extracción IA
// ============================================================================
export async function extraerKPIsAccion(
  _prev: ExtraerKPIsState,
  formData: FormData,
): Promise<ExtraerKPIsState> {
  const efmId = formData.get("efm_id") as string;
  if (!efmId)
    return { ...initialExtraerKPIsState, error: "Falta paquete." };
  const g = await gateEFM(efmId);
  if (!g.ok) return { ...initialExtraerKPIsState, error: g.error };

  const res = await extraerKPIsIA(efmId);
  if (!res.ok)
    return { ...initialExtraerKPIsState, error: res.error };

  revalidatePath(`/finanzas/estados-financieros/${efmId}`);
  return {
    ok: true,
    error: null,
    kpis: res.kpis,
    confidence: res.confidence,
  };
}
