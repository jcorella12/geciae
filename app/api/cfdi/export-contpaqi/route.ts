import JSZip from "jszip";
import { NextResponse, type NextRequest } from "next/server";

import { esCEO, obtenerVinculos, tieneAtributo } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/cfdi/export-contpaqi?empresa=<uuid>&anio=2026&mes=3&direccion=ambos
 *
 * Genera un paquete ZIP con todos los CFDIs del mes para el contador externo
 * (CONTPAQi). Incluye:
 *   - emitidos/<uuid>.xml ... (CFDIs que emitimos)
 *   - emitidos/<uuid>.pdf (cuando existe)
 *   - recibidos/<uuid>.xml ... (gastos que recibimos)
 *   - recibidos/<uuid>.pdf (cuando existe)
 *   - manifiesto.csv (lista con UUID, fecha, RFC emisor/receptor, total, etc.)
 *
 * Permisos: CEO o tesorero corporativo o aprobador financiero.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  }

  const v = await obtenerVinculos();
  if (
    !esCEO(v) &&
    !tieneAtributo(v, "tesorero_corporativo") &&
    !tieneAtributo(v, "aprobador_financiero")
  ) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const empresaId = sp.get("empresa") ?? "";
  const anio = parseInt(sp.get("anio") ?? "0", 10);
  const mes = parseInt(sp.get("mes") ?? "0", 10);
  const direccion = sp.get("direccion") ?? "ambos"; // emitidos | recibidos | ambos

  if (!empresaId) {
    return NextResponse.json(
      { error: "Falta empresa." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(anio) || anio < 2024 || anio > 2099) {
    return NextResponse.json({ error: "Año inválido." }, { status: 400 });
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "Mes inválido." }, { status: 400 });
  }

  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const hastaDate = new Date(anio, mes, 1); // primer día del mes siguiente
  const hasta = hastaDate.toISOString().slice(0, 10);

  // Empresa
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, rfc")
    .eq("id", empresaId)
    .maybeSingle();
  if (!empresa) {
    return NextResponse.json(
      { error: "Empresa no encontrada." },
      { status: 404 },
    );
  }

  // CFDIs del mes
  let q = supabase
    .from("cfdi")
    .select(
      `id, tipo, es_emitido, serie, folio, uuid_sat, fecha_emision,
       fecha_timbrado, rfc_emisor, nombre_emisor, rfc_receptor, nombre_receptor,
       uso_cfdi, metodo_pago, forma_pago, moneda, subtotal, iva_trasladado,
       iva_retenido, isr_retenido, total, estado, url_xml, url_pdf`,
    )
    .eq("empresa_id", empresaId)
    .gte("fecha_emision", desde)
    .lt("fecha_emision", hasta)
    .neq("estado", "borrador" as never)
    .order("fecha_emision", { ascending: true });

  if (direccion === "emitidos") q = q.eq("es_emitido", true);
  if (direccion === "recibidos") q = q.eq("es_emitido", false);

  const { data: cfdis, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!cfdis || cfdis.length === 0) {
    return NextResponse.json(
      {
        error: `Sin CFDIs en ${empresa.codigo} para ${String(mes).padStart(2, "0")}/${anio}.`,
      },
      { status: 404 },
    );
  }

  const zip = new JSZip();

  // Manifiesto CSV
  const manifiestoHeader = [
    "Tipo",
    "Direccion",
    "Serie",
    "Folio",
    "UUID",
    "Fecha emision",
    "Fecha timbrado",
    "RFC emisor",
    "Nombre emisor",
    "RFC receptor",
    "Nombre receptor",
    "Uso CFDI",
    "Metodo pago",
    "Forma pago",
    "Moneda",
    "Subtotal",
    "IVA trasladado",
    "IVA retenido",
    "ISR retenido",
    "Total",
    "Estado",
    "Archivo XML",
    "Archivo PDF",
  ].join(",");

  const manifestoLineas: string[] = [manifiestoHeader];

  // Stats
  let xmlCount = 0;
  let pdfCount = 0;
  const errores: string[] = [];

  for (const c of cfdis) {
    const dirLabel = c.es_emitido ? "emitidos" : "recibidos";
    const folder = `${dirLabel}`;
    const baseName = `${c.uuid_sat ?? c.id}`;

    let xmlPath: string | null = null;
    let pdfPath: string | null = null;

    // Descargar XML del bucket si existe
    if (c.url_xml) {
      try {
        const { data: blob, error: blobErr } = await supabase.storage
          .from("cfdi")
          .download(c.url_xml as string);
        if (blob && !blobErr) {
          const buf = Buffer.from(await blob.arrayBuffer());
          xmlPath = `${folder}/${baseName}.xml`;
          zip.file(xmlPath, buf);
          xmlCount += 1;
        } else if (blobErr) {
          errores.push(`XML ${baseName}: ${blobErr.message}`);
        }
      } catch (err) {
        errores.push(`XML ${baseName}: ${(err as Error).message}`);
      }
    }
    if (c.url_pdf) {
      try {
        const { data: blob, error: blobErr } = await supabase.storage
          .from("cfdi")
          .download(c.url_pdf as string);
        if (blob && !blobErr) {
          const buf = Buffer.from(await blob.arrayBuffer());
          pdfPath = `${folder}/${baseName}.pdf`;
          zip.file(pdfPath, buf);
          pdfCount += 1;
        }
      } catch {
        // best-effort
      }
    }

    const csvRow = [
      c.tipo,
      dirLabel,
      c.serie ?? "",
      c.folio ?? "",
      c.uuid_sat ?? "",
      c.fecha_emision ?? "",
      c.fecha_timbrado ?? "",
      c.rfc_emisor ?? "",
      escapeCsv(c.nombre_emisor),
      c.rfc_receptor ?? "",
      escapeCsv(c.nombre_receptor),
      c.uso_cfdi ?? "",
      c.metodo_pago ?? "",
      c.forma_pago ?? "",
      c.moneda ?? "",
      Number(c.subtotal ?? 0).toFixed(2),
      Number(c.iva_trasladado ?? 0).toFixed(2),
      Number(c.iva_retenido ?? 0).toFixed(2),
      Number(c.isr_retenido ?? 0).toFixed(2),
      Number(c.total ?? 0).toFixed(2),
      c.estado ?? "",
      xmlPath ?? "",
      pdfPath ?? "",
    ].join(",");
    manifestoLineas.push(csvRow);
  }

  // Manifiesto + readme
  zip.file("manifiesto.csv", "﻿" + manifestoLineas.join("\n"));
  const readme = [
    `Paquete CFDI · CONTPAQi`,
    `Empresa: ${empresa.codigo} · ${empresa.razon_social}${(empresa as { rfc?: string }).rfc ? ` (${(empresa as { rfc?: string }).rfc})` : ""}`,
    `Periodo: ${String(mes).padStart(2, "0")}/${anio}`,
    `Dirección: ${direccion}`,
    ``,
    `CFDIs: ${cfdis.length}`,
    `XMLs incluidos: ${xmlCount}`,
    `PDFs incluidos: ${pdfCount}`,
    errores.length > 0 ? `Errores (${errores.length}):` : "",
    ...errores.map((e) => `  · ${e}`),
    ``,
    `Generado: ${new Date().toISOString()}`,
    `Por: ${user.email ?? user.id}`,
  ]
    .filter(Boolean)
    .join("\n");
  zip.file("LEEME.txt", readme);

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  const filename = `cfdi_${empresa.codigo}_${anio}-${String(mes).padStart(2, "0")}_${direccion}.zip`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache",
    },
  });
}

function escapeCsv(v: string | null | undefined): string {
  if (!v) return "";
  const needsQuote = v.includes(",") || v.includes('"') || v.includes("\n");
  const escaped = v.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}
