"use server";

import JSZip from "jszip";
import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
  type Vinculo,
} from "@/lib/auth/permisos";
import {
  parseCfdiXml,
  tipoCfdiDb,
  type CfdiParsed,
} from "@/lib/cfdi/parser";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type {
  ImportarZipDetalle,
  ImportarZipState,
  ImportarZipStatus,
} from "./state";

// ────────────────────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────────────────────

const MAX_ZIP_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_XMLS_POR_ZIP = 1000;
const MAX_XML_BYTES = 5 * 1024 * 1024; // 5 MB por archivo

type EmpresaRow = {
  id: string;
  codigo: string;
  rfc: string;
};

type ProveedorRow = { id: string; rfc: string };
type ClienteRow = { id: string; rfc: string | null };

// ────────────────────────────────────────────────────────────────────────────
// Permisos
// ────────────────────────────────────────────────────────────────────────────

function gateRegistrar(vinculos: Vinculo[], empresaId: string): boolean {
  return (
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "tesorero_corporativo") ||
    esRolEn(vinculos, empresaId, ["director", "operativo"])
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Extrae el UUID (folio fiscal) del nombre de archivo. El SAT entrega los
 * descargados como `{UUID}.xml` y `{UUID}.pdf`. Si el nombre no matchea el
 * patrón UUID se usa el basename completo (suficiente para emparejar par
 * XML/PDF que comparten basename).
 */
function basenameKey(path: string): string {
  // Quitar carpeta y extensión
  const sinDir = path.replace(/^.*[\\/]/, "");
  return sinDir.replace(/\.(xml|pdf|XML|PDF)$/, "").toLowerCase();
}

function emptyDetalle(filename: string): ImportarZipDetalle {
  return {
    filename,
    uuid: null,
    status: "error",
    cfdi_id: null,
    empresa_codigo: null,
    tipo: null,
    total: null,
    es_emitido: null,
    rfc_contraparte: null,
    con_pdf: false,
    error: null,
  };
}

function tipoEtiqueta(parsed: CfdiParsed): string {
  switch (parsed.tipo_comprobante) {
    case "I":
      return "Ingreso";
    case "E":
      return "Egreso";
    case "T":
      return "Traslado";
    case "N":
      return "Nómina";
    case "P":
      return "Pago";
    default:
      return parsed.tipo_comprobante;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Procesar un XML individual (reusable)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Procesa un par XML+PDF (PDF opcional) y registra el CFDI.
 * Devuelve la línea de detalle correspondiente.
 *
 * Reusa la misma lógica de subirCfdi (cfdi/actions.ts) pero:
 *   - Selecciona empresa automáticamente por RFC (sin intervención manual)
 *   - Auto-vincula proveedor/cliente por RFC
 *   - No vincula OC/OT (queda como tarea de revisión post-import)
 *   - Maneja complemento de pago (cfdi_pagos + cascade) igual que el flow
 *     individual.
 */
async function procesarUnCfdi(opts: {
  filename: string;
  xmlBytes: Uint8Array;
  pdfBytes: Uint8Array | null;
  supabase: ReturnType<typeof createClient>;
  userId: string;
  vinculos: Vinculo[];
  empresas: EmpresaRow[];
  proveedores: ProveedorRow[];
  clientes: ClienteRow[];
}): Promise<ImportarZipDetalle> {
  const det = emptyDetalle(opts.filename);
  det.con_pdf = !!opts.pdfBytes;

  // 1. Parse XML
  let parsed: CfdiParsed;
  try {
    const xmlText = new TextDecoder("utf-8").decode(opts.xmlBytes);
    parsed = parseCfdiXml(xmlText);
  } catch (e) {
    det.status = "error";
    det.error = `XML inválido: ${(e as Error).message}`;
    return det;
  }

  if (!parsed.uuid_sat) {
    det.status = "error";
    det.error = "Sin UUID (¿XML sin timbrar?)";
    return det;
  }
  det.uuid = parsed.uuid_sat;
  det.total = parsed.total;
  det.tipo = tipoEtiqueta(parsed);

  // 2. Detectar empresa del grupo por RFC (emisor o receptor)
  const rfcEmisor = parsed.rfc_emisor.toUpperCase();
  const rfcReceptor = parsed.rfc_receptor.toUpperCase();
  const empresaEmisor = opts.empresas.find(
    (e) => e.rfc.toUpperCase() === rfcEmisor,
  );
  const empresaReceptor = opts.empresas.find(
    (e) => e.rfc.toUpperCase() === rfcReceptor,
  );

  // Preferencia: la que NO esté ambos lados; si ambos son del grupo
  // (inter-co), preferimos la del receptor (gasto/recibido) — el emisor
  // ya debió subir la suya por su lado.
  let empresa: EmpresaRow | null = null;
  let esEmitido = false;
  if (empresaEmisor && empresaReceptor) {
    // Inter-co: registramos como recibido para no duplicar al emisor.
    empresa = empresaReceptor;
    esEmitido = false;
  } else if (empresaEmisor) {
    empresa = empresaEmisor;
    esEmitido = true;
  } else if (empresaReceptor) {
    empresa = empresaReceptor;
    esEmitido = false;
  }

  if (!empresa) {
    det.status = "sin_empresa";
    det.error = `Ningún RFC del grupo aparece (emisor=${rfcEmisor}, receptor=${rfcReceptor})`;
    det.rfc_contraparte = esEmitido ? rfcReceptor : rfcEmisor;
    return det;
  }

  det.empresa_codigo = empresa.codigo;
  det.es_emitido = esEmitido;
  det.rfc_contraparte = esEmitido ? rfcReceptor : rfcEmisor;

  // 3. Permiso por empresa
  if (!gateRegistrar(opts.vinculos, empresa.id)) {
    det.status = "error";
    det.error = `Sin permiso para registrar CFDI en ${empresa.codigo}`;
    return det;
  }

  // 4. Duplicado
  const { data: existente } = await opts.supabase
    .from("cfdi")
    .select("id")
    .eq("uuid_sat", parsed.uuid_sat)
    .maybeSingle();
  if (existente) {
    det.status = "duplicado";
    det.cfdi_id = existente.id;
    det.error = "UUID ya registrado";
    return det;
  }

  // 5. Auto-vincular proveedor/cliente por RFC
  const rfcContraparte = (esEmitido ? rfcReceptor : rfcEmisor).toUpperCase();
  let cliente_id: string | null = null;
  let proveedor_id: string | null = null;
  if (esEmitido) {
    const c = opts.clientes.find(
      (x) => (x.rfc ?? "").toUpperCase() === rfcContraparte,
    );
    // Saltar auto-vinculación si es cliente potencial (rfc null no
    // matchea de todos modos, pero blindamos).
    if (c && c.rfc) cliente_id = c.id;
  } else {
    const p = opts.proveedores.find(
      (x) => x.rfc.toUpperCase() === rfcContraparte,
    );
    if (p) proveedor_id = p.id;
  }

  // 6. Subir archivos al storage
  const baseName = `${empresa.id}/${parsed.uuid_sat}`;
  const xmlPath = `${baseName}.xml`;
  const xmlUpload = await opts.supabase.storage
    .from("cfdi")
    .upload(xmlPath, opts.xmlBytes, {
      cacheControl: "3600",
      upsert: true,
      contentType: "application/xml",
    });
  if (xmlUpload.error) {
    det.status = "error";
    det.error = `Error subiendo XML: ${xmlUpload.error.message}`;
    return det;
  }

  let pdfUrl: string | null = null;
  if (opts.pdfBytes && opts.pdfBytes.length > 0) {
    const pdfPath = `${baseName}.pdf`;
    const pdfUpload = await opts.supabase.storage
      .from("cfdi")
      .upload(pdfPath, opts.pdfBytes, {
        cacheControl: "3600",
        upsert: true,
        contentType: "application/pdf",
      });
    if (!pdfUpload.error) pdfUrl = pdfPath;
  }

  // 7. Insertar CFDI
  const { data: cfdi, error: insErr } = await opts.supabase
    .from("cfdi")
    .insert({
      empresa_id: empresa.id,
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
      oc_id: null,
      ot_id: null,
      proyecto_id: null,
      centro_id: null,
      url_xml: xmlPath,
      url_pdf: pdfUrl,
      estado: "timbrado",
      pac_proveedor: "bulk_zip_upload",
      capturado_por: opts.userId,
    } as never)
    .select("id")
    .single();

  if (insErr || !cfdi) {
    // Rollback archivos
    await opts.supabase.storage.from("cfdi").remove([xmlPath]);
    if (pdfUrl) await opts.supabase.storage.from("cfdi").remove([pdfUrl]);
    det.status = "error";
    det.error = insErr?.message?.includes("duplicate")
      ? "UUID duplicado (race condition)"
      : `Error al guardar: ${insErr?.message ?? "desconocido"}`;
    return det;
  }

  det.cfdi_id = cfdi.id;

  // 8. Insertar conceptos (best-effort)
  if (parsed.conceptos.length > 0) {
    const { error: errC } = await opts.supabase.from("cfdi_conceptos").insert(
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
      console.error(`[bulk-zip ${cfdi.id}] conceptos:`, errC.message);
    }
  }

  // 9. Complemento de pago — réplica de la lógica de subirCfdi
  if (parsed.tipo_comprobante === "P" && parsed.pagos.length > 0) {
    for (const pago of parsed.pagos) {
      for (const doc of pago.docto_relacionados) {
        if (!doc.uuid_documento) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: original } = await (opts.supabase as any)
          .from("cfdi")
          .select("id, total, monto_pagado, empresa_id")
          .ilike("uuid_sat", doc.uuid_documento)
          .maybeSingle();
        if (!original) {
          console.warn(
            `[bulk-zip:complemento ${cfdi.id}] UUID ${doc.uuid_documento} no encontrado`,
          );
          continue;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: pagoErr } = await (opts.supabase as any)
          .from("cfdi_pagos")
          .insert({
            cfdi_id: cfdi.id,
            cfdi_pagado_id: original.id,
            fecha_pago: pago.fecha_pago,
            forma_pago: pago.forma_pago,
            moneda: doc.moneda,
            monto: doc.imp_pagado,
            num_operacion: pago.num_operacion,
            manual: false,
            registrado_por: opts.userId,
            observaciones: `Parcialidad ${doc.num_parcialidad}, saldo previo ${doc.imp_saldo_anterior}, saldo restante ${doc.imp_saldo_insoluto}`,
          });
        if (pagoErr) {
          console.error(
            `[bulk-zip:complemento ${cfdi.id}] cfdi_pagos:`,
            pagoErr.message,
          );
          continue;
        }
        const yaPagado = Number(original.monto_pagado ?? 0);
        const totalOriginal = Number(original.total ?? 0);
        const nuevoPagado = yaPagado + Number(doc.imp_pagado);
        const totalmentePagado = nuevoPagado >= totalOriginal - 0.01;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updPayload: any = { monto_pagado: nuevoPagado };
        if (totalmentePagado) {
          updPayload.fecha_pago = pago.fecha_pago.slice(0, 10);
          updPayload.estado = "pagado";
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (opts.supabase as any)
          .from("cfdi")
          .update(updPayload)
          .eq("id", original.id);
      }
    }
  }

  det.status = "creado";
  return det;
}

// ────────────────────────────────────────────────────────────────────────────
// Server action principal
// ────────────────────────────────────────────────────────────────────────────

/**
 * Importa masivamente CFDIs desde un ZIP descargado del portal del SAT.
 *
 * Estructura esperada (la que entrega el SAT y otros descargadores):
 *   - Carpeta-raíz opcional (RFC del contribuyente)
 *   - Pares `{UUID}.xml` + `{UUID}.pdf` (PDF opcional)
 *
 * Heurística de empresa por XML:
 *   - Si el RFC del Emisor del XML matchea una empresa del grupo → emitido
 *   - Si el RFC del Receptor matchea → recibido
 *   - Si AMBOS matchean (inter-co) → solo se registra como recibido (la
 *     emisora debió subir la suya en su propio ZIP)
 *   - Si NINGUNO matchea → status = "sin_empresa" (no se registra)
 */
export async function importarZipCfdi(
  _prev: ImportarZipState,
  formData: FormData,
): Promise<ImportarZipState> {
  // 1) Cliente regular SOLO para validar sesión (lee JWT del usuario).
  const supabaseAuth = createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "Sin sesión.",
      resumen: null,
      detalle: [],
    };
  }

  const vinculos = await obtenerVinculos();
  if (vinculos.length === 0) {
    return {
      ok: false,
      error: "Sin acceso a ninguna empresa.",
      resumen: null,
      detalle: [],
    };
  }

  // 2) Cliente admin para reads/writes DESPUÉS de validar sesión y vínculos.
  // El gate de permisos por empresa se hace en código TS (gateRegistrar),
  // no por RLS — esto es defensivo contra storage policies que no quedaron
  // aplicadas al migrar de proyecto Supabase y evita pelearse con RLS para
  // un flujo batch donde ya validamos quién es el usuario.
  const supabaseAdmin = createAdminClient();

  const zipFile = formData.get("zip") as File | null;
  if (!zipFile || zipFile.size === 0) {
    return {
      ok: false,
      error: "Falta el archivo ZIP.",
      resumen: null,
      detalle: [],
    };
  }
  if (zipFile.size > MAX_ZIP_BYTES) {
    return {
      ok: false,
      error: `ZIP excede ${MAX_ZIP_BYTES / 1024 / 1024} MB. Divide en archivos más pequeños.`,
      resumen: null,
      detalle: [],
    };
  }

  // 3) Catálogos para auto-detección — admin client garantiza ver todos los
  // proveedores/clientes para el matching por RFC (sin importar a qué
  // empresas está vinculado el usuario).
  const [{ data: empresasData }, { data: proveedoresData }, { data: clientesData }] =
    await Promise.all([
      supabaseAdmin.from("empresas").select("id, codigo, rfc"),
      supabaseAdmin.from("proveedores").select("id, rfc"),
      supabaseAdmin.from("clientes").select("id, rfc"),
    ]);

  const empresas: EmpresaRow[] = (empresasData ?? []) as EmpresaRow[];
  const proveedores: ProveedorRow[] = (proveedoresData ?? []) as ProveedorRow[];
  const clientes: ClienteRow[] = (clientesData ?? []) as ClienteRow[];

  if (empresas.length === 0) {
    return {
      ok: false,
      error: "No hay empresas configuradas en el sistema.",
      resumen: null,
      detalle: [],
    };
  }

  // 2. Descomprimir
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
  } catch (e) {
    return {
      ok: false,
      error: `ZIP corrupto o inválido: ${(e as Error).message}`,
      resumen: null,
      detalle: [],
    };
  }

  // 3. Indexar archivos: XMLs por basename + PDFs por basename
  type XmlEntry = { path: string; entry: JSZip.JSZipObject };
  const xmlsPorClave = new Map<string, XmlEntry>();
  const pdfsPorClave = new Map<string, JSZip.JSZipObject>();
  let totalArchivos = 0;
  zip.forEach((path, entry) => {
    if (entry.dir) return;
    totalArchivos += 1;
    const lower = path.toLowerCase();
    const clave = basenameKey(path);
    if (lower.endsWith(".xml")) {
      // Si hay duplicados (ZIP raro), preferimos el primero
      if (!xmlsPorClave.has(clave)) {
        xmlsPorClave.set(clave, { path, entry });
      }
    } else if (lower.endsWith(".pdf")) {
      if (!pdfsPorClave.has(clave)) {
        pdfsPorClave.set(clave, entry);
      }
    }
  });

  if (xmlsPorClave.size === 0) {
    return {
      ok: false,
      error: "El ZIP no contiene XMLs.",
      resumen: null,
      detalle: [],
    };
  }

  if (xmlsPorClave.size > MAX_XMLS_POR_ZIP) {
    return {
      ok: false,
      error: `ZIP contiene ${xmlsPorClave.size} XMLs (máx ${MAX_XMLS_POR_ZIP}). Divide en lotes.`,
      resumen: null,
      detalle: [],
    };
  }

  // 4. Procesar cada XML
  const detalle: ImportarZipDetalle[] = [];

  for (const [clave, xmlEntry] of Array.from(xmlsPorClave.entries())) {
    const filename = xmlEntry.path;
    try {
      const xmlBytes = await xmlEntry.entry.async("uint8array");
      if (xmlBytes.length > MAX_XML_BYTES) {
        const det = emptyDetalle(filename);
        det.status = "error";
        det.error = `XML excede ${MAX_XML_BYTES / 1024 / 1024} MB`;
        detalle.push(det);
        continue;
      }

      let pdfBytes: Uint8Array | null = null;
      const pdfEntry = pdfsPorClave.get(clave);
      if (pdfEntry) {
        pdfBytes = await pdfEntry.async("uint8array");
      }

      const det = await procesarUnCfdi({
        filename,
        xmlBytes,
        pdfBytes,
        supabase: supabaseAdmin,
        userId: user.id,
        vinculos,
        empresas,
        proveedores,
        clientes,
      });
      detalle.push(det);
    } catch (e) {
      const det = emptyDetalle(filename);
      det.status = "error";
      det.error = `Fallo inesperado: ${(e as Error).message}`;
      detalle.push(det);
    }
  }

  // 5. Resumen
  const contar = (s: ImportarZipStatus): number =>
    detalle.filter((d) => d.status === s).length;
  const resumen = {
    total_archivos: totalArchivos,
    total_xmls: xmlsPorClave.size,
    creados: contar("creado"),
    duplicados: contar("duplicado"),
    sin_empresa: contar("sin_empresa"),
    saltados: contar("saltado"),
    errores: contar("error"),
  };

  revalidatePath("/finanzas/cfdi");

  return {
    ok: true,
    error: null,
    resumen,
    detalle,
  };
}
