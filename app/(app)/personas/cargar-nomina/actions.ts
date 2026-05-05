"use server";

import JSZip from "jszip";
import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { parseXmlNomina, type NominaParsed } from "@/lib/nomina/parser";
import {
  initialSubirNominaState,
  type SubirNominaState,
} from "@/lib/nomina/state";
import { createClient } from "@/lib/supabase/server";

type ResultadoArchivo =
  | { ok: true; uuid: string; empleado_creado?: boolean }
  | { ok: false; archivo: string; error: string; curp?: string };

async function gateNominaUpload(
  empresaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  if (!esCEO(v) && !esRolEn(v, empresaId, "director"))
    return {
      ok: false,
      error: "Sin permiso (requiere CEO o director de la empresa).",
    };
  return { ok: true };
}

/**
 * Procesa lote: ZIP o varios XMLs sueltos.
 * - Crea un nomina_uploads (estado=procesando)
 * - Por cada XML: parsea, busca empleado por CURP, inserta recibos+conceptos
 * - Si no encuentra empleado: marca CURP como "nueva detectada"
 * - Sube XML a Storage privado
 * - Actualiza estado final del upload
 */
export async function procesarLoteXmls(
  _prev: SubirNominaState,
  formData: FormData,
): Promise<SubirNominaState> {
  const empresaId = formData.get("empresa_id") as string;
  if (!empresaId)
    return { ...initialSubirNominaState, error: "Selecciona empresa." };

  const gate = await gateNominaUpload(empresaId);
  if (!gate.ok) return { ...initialSubirNominaState, error: gate.error };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ...initialSubirNominaState, error: "Sin sesión." };

  // Recolectar archivos: pueden venir varios o 1 ZIP
  const archivos = formData.getAll("archivos") as File[];
  if (archivos.length === 0)
    return {
      ...initialSubirNominaState,
      error: "Selecciona al menos un archivo.",
    };

  // Expandir ZIPs
  const xmlsAProcesar: { name: string; content: string }[] = [];
  for (const f of archivos) {
    if (f.size === 0) continue;
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".zip")) {
      try {
        const buf = await f.arrayBuffer();
        const zip = await JSZip.loadAsync(buf);
        for (const [path, entry] of Object.entries(zip.files)) {
          if (entry.dir) continue;
          if (!path.toLowerCase().endsWith(".xml")) continue;
          const content = await entry.async("string");
          xmlsAProcesar.push({ name: path, content });
        }
      } catch (e) {
        return {
          ...initialSubirNominaState,
          error: `Error leyendo ZIP ${f.name}: ${e instanceof Error ? e.message : "?"}`,
        };
      }
    } else if (lower.endsWith(".xml")) {
      const content = await f.text();
      xmlsAProcesar.push({ name: f.name, content });
    }
  }

  if (xmlsAProcesar.length === 0)
    return {
      ...initialSubirNominaState,
      error: "No se encontraron XMLs en los archivos seleccionados.",
    };

  // Crear upload registro
  const { data: upload, error: upErr } = await supabase
    .from("nomina_uploads")
    .insert({
      empresa_id: empresaId,
      cargado_por: user.id,
      archivo_original_nombre: archivos.map((a) => a.name).join(", "),
      total_archivos: xmlsAProcesar.length,
      estado: "procesando" as never,
    })
    .select("id")
    .single();
  if (upErr || !upload)
    return {
      ...initialSubirNominaState,
      error: `Error registrando upload: ${upErr?.message ?? "?"}`,
    };

  const uploadId = upload.id;
  const resultados: ResultadoArchivo[] = [];
  const curpsNuevas: string[] = [];
  let totalNeto = 0;

  for (const x of xmlsAProcesar) {
    let parsed: NominaParsed;
    try {
      parsed = parseXmlNomina(x.content);
    } catch (e) {
      resultados.push({
        ok: false,
        archivo: x.name,
        error: e instanceof Error ? e.message : "Error parseando XML",
      });
      continue;
    }

    // Buscar empleado por CURP
    const { data: empleado } = await supabase
      .from("empleados")
      .select("id, empresa_id")
      .eq("curp", parsed.curp)
      .maybeSingle();

    if (!empleado) {
      // Empleado nuevo detectado, no inserta el recibo aún
      if (!curpsNuevas.includes(parsed.curp)) curpsNuevas.push(parsed.curp);
      resultados.push({
        ok: false,
        archivo: x.name,
        error: `Empleado con CURP ${parsed.curp} no existe en el sistema.`,
        curp: parsed.curp,
      });
      continue;
    }

    // Verificar empresa coincide (warning si difiere — el RFC del emisor
    // del XML debe coincidir con la empresa elegida)
    if (empleado.empresa_id !== empresaId) {
      resultados.push({
        ok: false,
        archivo: x.name,
        error: `Empleado ${parsed.curp} pertenece a otra empresa, no a la elegida.`,
      });
      continue;
    }

    // Subir XML a Storage
    const yyyy = parsed.fecha_pago.slice(0, 4);
    const mm = parsed.fecha_pago.slice(5, 7);
    const path = `${empresaId}/${yyyy}/${mm}/${parsed.curp}/${parsed.uuid_cfdi}.xml`;
    const { error: storageErr } = await supabase.storage
      .from("nomina-xmls")
      .upload(path, x.content, {
        contentType: "application/xml",
        upsert: true,
      });
    if (storageErr) {
      resultados.push({
        ok: false,
        archivo: x.name,
        error: `Error subiendo a Storage: ${storageErr.message}`,
      });
      continue;
    }

    // Insertar recibo (idempotente por uuid_cfdi UNIQUE)
    const { data: recibo, error: insRec } = await supabase
      .from("nomina_recibos")
      .insert({
        empresa_id: empresaId,
        empleado_id: empleado.id,
        uuid_cfdi: parsed.uuid_cfdi,
        serie: parsed.serie,
        folio: parsed.folio,
        fecha_emision: parsed.fecha_emision,
        fecha_pago: parsed.fecha_pago,
        fecha_inicial_pago: parsed.fecha_inicial_pago,
        fecha_final_pago: parsed.fecha_final_pago,
        num_dias_pagados: parsed.num_dias_pagados,
        periodicidad: parsed.periodicidad as never,
        tipo: parsed.tipo as never,
        total_percepciones: parsed.total_percepciones,
        total_deducciones: parsed.total_deducciones,
        total_otros_pagos: parsed.total_otros_pagos,
        total_neto: parsed.total_neto,
        sueldo_base_cotizacion: parsed.sueldo_base_cotizacion,
        salario_diario_integrado: parsed.salario_diario_integrado,
        url_xml: path,
        upload_id: uploadId,
      })
      .select("id")
      .single();

    if (insRec) {
      // Si UNIQUE falla, ignorar duplicado
      if (insRec.message.includes("duplicate")) {
        resultados.push({
          ok: true,
          uuid: parsed.uuid_cfdi,
        });
        continue;
      }
      resultados.push({
        ok: false,
        archivo: x.name,
        error: `Error insertando recibo: ${insRec.message}`,
      });
      continue;
    }

    if (recibo) {
      // Insertar conceptos
      const conceptosRows = parsed.conceptos.map((c) => ({
        recibo_id: recibo.id,
        tipo: c.tipo as never,
        clave_sat: c.clave_sat,
        tipo_clave: c.tipo_clave,
        concepto: c.concepto,
        importe_gravado: c.importe_gravado,
        importe_exento: c.importe_exento,
        importe_total: c.importe_total,
      }));
      if (conceptosRows.length > 0) {
        await supabase.from("nomina_conceptos").insert(conceptosRows);
      }

      totalNeto += parsed.total_neto;
      resultados.push({ ok: true, uuid: parsed.uuid_cfdi });
    }
  }

  const procesados = resultados.filter((r) => r.ok).length;
  const fallidos = resultados.filter((r) => !r.ok).length;
  const erroresList = resultados
    .filter((r): r is Extract<ResultadoArchivo, { ok: false }> => !r.ok)
    .map((r) => ({ archivo: r.archivo, error: r.error, curp: r.curp ?? null }));

  const estadoFinal: "completado" | "completado_con_errores" =
    fallidos === 0 ? "completado" : "completado_con_errores";

  await supabase
    .from("nomina_uploads")
    .update({
      archivos_procesados: procesados,
      archivos_fallidos: fallidos,
      empleados_nuevos_detectados: curpsNuevas.length,
      curps_nuevas: curpsNuevas as never,
      total_neto_pagado: totalNeto,
      errores: erroresList as never,
      estado: estadoFinal as never,
      procesado_at: new Date().toISOString(),
    })
    .eq("id", uploadId);

  revalidatePath("/personas/cargar-nomina");
  revalidatePath("/personas");
  return { ok: true, error: null, uploadId };
}

/** Server action: log de acceso a recibo (privacidad). */
export async function registrarAccesoRecibo(
  empleadoId: string,
  reciboId: string | null,
  accion: string,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("nomina_accesos_log").insert({
    usuario_id: user.id,
    empleado_consultado_id: empleadoId,
    recibo_id: reciboId,
    accion,
  });
}

/** Devuelve URL signed de descarga del XML. */
export async function obtenerUrlXml(
  reciboId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: recibo } = await supabase
    .from("nomina_recibos")
    .select("url_xml, empleado_id")
    .eq("id", reciboId)
    .maybeSingle();
  if (!recibo) return { ok: false, error: "Recibo no encontrado." };

  const { data: signed, error } = await supabase.storage
    .from("nomina-xmls")
    .createSignedUrl(recibo.url_xml, 60 * 5); // 5 min
  if (error || !signed)
    return {
      ok: false,
      error: error?.message ?? "No se pudo generar URL.",
    };

  await registrarAccesoRecibo(recibo.empleado_id, reciboId, "descargar_xml");
  return { ok: true, url: signed.signedUrl };
}

/** Devuelve URL signed de descarga del PDF (si existe). */
export async function obtenerUrlPdf(
  reciboId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: recibo } = await supabase
    .from("nomina_recibos")
    .select("url_pdf, empleado_id")
    .eq("id", reciboId)
    .maybeSingle();
  if (!recibo) return { ok: false, error: "Recibo no encontrado." };
  if (!recibo.url_pdf)
    return { ok: false, error: "Este recibo no tiene PDF cargado." };

  const { data: signed, error } = await supabase.storage
    .from("nomina-xmls")
    .createSignedUrl(recibo.url_pdf, 60 * 5);
  if (error || !signed)
    return {
      ok: false,
      error: error?.message ?? "No se pudo generar URL.",
    };

  await registrarAccesoRecibo(recibo.empleado_id, reciboId, "descargar_pdf");
  return { ok: true, url: signed.signedUrl };
}
