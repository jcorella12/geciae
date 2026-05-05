"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { parseCfdiXml, tipoCfdiDb } from "@/lib/cfdi/parser";
import type { CfdiUploadState } from "@/lib/cfdi/state";
import { createClient } from "@/lib/supabase/server";

function gateRegistrar(
  vinculos: Awaited<ReturnType<typeof obtenerVinculos>>,
  empresaId: string,
): boolean {
  return (
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "tesorero_corporativo") ||
    esRolEn(vinculos, empresaId, ["director", "operativo"])
  );
}

/**
 * Registra un CFDI en el sistema parseando el XML que el SAT timbró.
 * El usuario también puede subir el PDF para tener el comprobante visual.
 *
 * El XML es la fuente de verdad — el sistema lo lee y popula todos los campos.
 * El usuario solo decide:
 *  - empresa del grupo (a quién pertenece)
 *  - es_emitido: TRUE si el grupo lo emitió, FALSE si es gasto recibido
 *  - vinculaciones opcionales: cliente_id, proveedor_id, oc_id, ot_id, proyecto_id
 */
export async function subirCfdi(
  _prev: CfdiUploadState,
  formData: FormData,
): Promise<CfdiUploadState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, cfdiId: null, error: "Sin sesión." };
  }

  const empresaId = formData.get("empresa_id") as string;
  if (!empresaId) {
    return { ok: false, cfdiId: null, error: "Falta empresa." };
  }
  const v = await obtenerVinculos();
  if (!gateRegistrar(v, empresaId)) {
    return {
      ok: false,
      cfdiId: null,
      error: "Sin permiso para registrar CFDI en esta empresa.",
    };
  }

  const xmlFile = formData.get("xml") as File | null;
  if (!xmlFile || xmlFile.size === 0) {
    return { ok: false, cfdiId: null, error: "Falta el archivo XML." };
  }
  if (xmlFile.size > 5 * 1024 * 1024) {
    return { ok: false, cfdiId: null, error: "XML excede 5 MB." };
  }
  const pdfFile = formData.get("pdf") as File | null;

  let parsed;
  try {
    const xmlText = await xmlFile.text();
    parsed = parseCfdiXml(xmlText);
  } catch (e) {
    return {
      ok: false,
      cfdiId: null,
      error: `XML inválido: ${(e as Error).message}`,
    };
  }
  if (!parsed.uuid_sat) {
    return {
      ok: false,
      cfdiId: null,
      error: "El XML no tiene UUID (¿está sin timbrar?).",
    };
  }

  // Detectar duplicado por UUID
  const { data: existente } = await supabase
    .from("cfdi")
    .select("id")
    .eq("uuid_sat", parsed.uuid_sat)
    .maybeSingle();
  if (existente) {
    return {
      ok: false,
      cfdiId: existente.id,
      error: "Este CFDI ya fue registrado anteriormente.",
    };
  }

  // Determinar es_emitido: cargar la empresa y comparar RFC
  const { data: empresa } = await supabase
    .from("empresas")
    .select("rfc")
    .eq("id", empresaId)
    .maybeSingle();
  if (!empresa) {
    return { ok: false, cfdiId: null, error: "Empresa no encontrada." };
  }
  const esEmitidoFlag = formData.get("es_emitido");
  // Si el usuario no lo dijo, lo deducimos del RFC
  const esEmitido =
    esEmitidoFlag === "true"
      ? true
      : esEmitidoFlag === "false"
        ? false
        : empresa.rfc.toUpperCase() === parsed.rfc_emisor.toUpperCase();

  // Vinculaciones opcionales
  const cliente_id = (formData.get("cliente_id") as string) || null;
  const proveedor_id = (formData.get("proveedor_id") as string) || null;
  const oc_id = (formData.get("oc_id") as string) || null;
  const ot_id = (formData.get("ot_id") as string) || null;
  const proyecto_id = (formData.get("proyecto_id") as string) || null;
  const centro_id = (formData.get("centro_id") as string) || null;

  // Sprint 2.2: bloquear timbrado de CFDI emitido a cliente potencial
  // (sin RFC formal). El cliente debe convertirse a formal primero.
  if (cliente_id && esEmitido) {
    const { data: cli } = await supabase
      .from("clientes")
      .select("id, rfc")
      .eq("id", cliente_id)
      .maybeSingle();
    // La constraint chk_cliente_rfc_potencial garantiza que rfc IS NULL ⇔ es_potencial,
    // así que `rfc === null` lo identifica sin necesidad de tipos regenerados.
    if (cli && cli.rfc === null) {
      return {
        ok: false,
        cfdiId: null,
        error:
          "Este cliente es potencial (sin RFC). Conviértelo a cliente formal antes de emitirle un CFDI.",
      };
    }
  }

  // Subir archivos al bucket
  const baseName = `${empresaId}/${parsed.uuid_sat}`;
  const xmlPath = `${baseName}.xml`;
  const xmlUpload = await supabase.storage
    .from("cfdi")
    .upload(xmlPath, xmlFile, {
      cacheControl: "3600",
      upsert: true,
      contentType: "application/xml",
    });
  if (xmlUpload.error) {
    return {
      ok: false,
      cfdiId: null,
      error: `Error subiendo XML: ${xmlUpload.error.message}`,
    };
  }
  let pdfUrl: string | null = null;
  if (pdfFile && pdfFile.size > 0) {
    const pdfPath = `${baseName}.pdf`;
    const pdfUpload = await supabase.storage
      .from("cfdi")
      .upload(pdfPath, pdfFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: "application/pdf",
      });
    if (!pdfUpload.error) pdfUrl = pdfPath;
  }

  // Insertar CFDI
  const { data: cfdi, error } = await supabase
    .from("cfdi")
    .insert({
      empresa_id: empresaId,
      tipo: tipoCfdiDb(parsed.tipo_comprobante),
      es_emitido: esEmitido,
      serie: parsed.serie,
      folio: parsed.folio,
      uuid_sat: parsed.uuid_sat,
      fecha_emision: parsed.fecha_emision,
      fecha_timbrado: parsed.fecha_timbrado,
      rfc_emisor: parsed.rfc_emisor,
      nombre_emisor: parsed.nombre_emisor,
      rfc_receptor: parsed.rfc_receptor,
      nombre_receptor: parsed.nombre_receptor,
      uso_cfdi: parsed.uso_cfdi,
      metodo_pago: parsed.metodo_pago,
      forma_pago: parsed.forma_pago,
      moneda: parsed.moneda,
      tipo_cambio: parsed.tipo_cambio,
      subtotal: parsed.subtotal,
      descuento: parsed.descuento,
      iva_trasladado: parsed.iva_trasladado,
      iva_retenido: parsed.iva_retenido,
      isr_retenido: parsed.isr_retenido,
      total: parsed.total,
      cliente_id,
      proveedor_id,
      oc_id,
      ot_id,
      proyecto_id,
      centro_id,
      url_xml: xmlPath,
      url_pdf: pdfUrl,
      estado: "timbrado",
      pac_proveedor: "manual_upload",
      capturado_por: user.id,
    })
    .select("id")
    .single();

  if (error || !cfdi) {
    // Rollback de archivos
    await supabase.storage.from("cfdi").remove([xmlPath]);
    if (pdfUrl) await supabase.storage.from("cfdi").remove([pdfUrl]);
    return {
      ok: false,
      cfdiId: null,
      error: error?.message?.includes("duplicate")
        ? "UUID duplicado."
        : `Error al guardar: ${error?.message ?? "desconocido"}`,
    };
  }

  // Insertar conceptos
  if (parsed.conceptos.length > 0) {
    const { error: errC } = await supabase
      .from("cfdi_conceptos")
      .insert(
        parsed.conceptos.map((c) => ({
          cfdi_id: cfdi.id,
          orden: c.orden,
          clave_sat: c.clave_sat,
          descripcion: c.descripcion,
          cantidad: c.cantidad,
          unidad_sat: c.unidad_sat,
          precio_unitario: c.precio_unitario,
          importe: c.importe,
          iva_tasa: c.iva_tasa,
          iva_importe: c.iva_importe,
        })),
      );
    if (errC) {
      // No es fatal — el CFDI quedó registrado
      console.error("Error insertando conceptos:", errC);
    }
  }

  // Si está vinculado a OC y la OC no tenía cfdi_recibido_id, asociarlo
  if (oc_id && !esEmitido) {
    await supabase
      .from("ordenes_compra")
      .update({ cfdi_recibido_id: cfdi.id })
      .eq("id", oc_id)
      .is("cfdi_recibido_id", null);
  }

  revalidatePath("/finanzas/cfdi");
  if (oc_id) revalidatePath(`/finanzas/oc/${oc_id}`);
  if (ot_id) revalidatePath(`/finanzas/ot/${ot_id}`);
  return { ok: true, cfdiId: cfdi.id, error: null };
}

export async function registrarPagoCfdi(
  cfdiId: string,
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const monto = Number(formData.get("monto_pago") ?? 0);
  if (!monto || monto <= 0) {
    return { ok: false, error: "Monto inválido." };
  }
  const fecha = (formData.get("fecha_pago") as string) || null;
  const formaPago = (formData.get("forma_pago") as string) || null;
  const observaciones = (formData.get("observaciones") as string) || null;

  const supabase = createClient();
  const { data: c } = await supabase
    .from("cfdi")
    .select("id, empresa_id, total, monto_pagado, estado")
    .eq("id", cfdiId)
    .maybeSingle();
  if (!c) return { ok: false, error: "CFDI no encontrado." };

  const v = await obtenerVinculos();
  if (!gateRegistrar(v, c.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }

  const total = Number(c.total ?? 0);
  const yaPagado = Number(c.monto_pagado ?? 0);
  const nuevoPagado = yaPagado + monto;
  if (nuevoPagado > total + 0.01) {
    return {
      ok: false,
      error: `Excede el total. Saldo: ${(total - yaPagado).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}.`,
    };
  }
  const totalmentePagado = nuevoPagado >= total - 0.01;

  const { error } = await supabase
    .from("cfdi")
    .update({
      monto_pagado: nuevoPagado,
      fecha_pago: totalmentePagado ? fecha ?? new Date().toISOString().slice(0, 10) : null,
      estado: totalmentePagado ? "pagado" : c.estado,
      observaciones: observaciones
        ? `${observaciones}${formaPago ? ` (${formaPago})` : ""}`
        : null,
    })
    .eq("id", cfdiId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/finanzas/cfdi");
  revalidatePath(`/finanzas/cfdi/${cfdiId}`);
  return { ok: true, error: null };
}

export async function cancelarCfdi(
  cfdiId: string,
  motivo: string,
  uuidSustituye?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: c } = await supabase
    .from("cfdi")
    .select("empresa_id, estado")
    .eq("id", cfdiId)
    .maybeSingle();
  if (!c) return { ok: false, error: "CFDI no encontrado." };
  if (c.estado === "cancelado") {
    return { ok: false, error: "Ya está cancelado." };
  }
  const v = await obtenerVinculos();
  if (!gateRegistrar(v, c.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }
  if (!motivo || !["01", "02", "03", "04"].includes(motivo)) {
    return {
      ok: false,
      error: "Motivo inválido (01, 02, 03 o 04 según SAT).",
    };
  }
  const { error } = await supabase
    .from("cfdi")
    .update({
      estado: "cancelado",
      motivo_cancelacion: motivo,
      uuid_sustituye: uuidSustituye || null,
    })
    .eq("id", cfdiId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/finanzas/cfdi");
  revalidatePath(`/finanzas/cfdi/${cfdiId}`);
  return { ok: true, error: null };
}
