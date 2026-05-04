import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/cfdi/export
 *
 * Exporta los CFDIs filtrados a CSV (compatible Excel con BOM UTF-8).
 * Aplica los mismos filtros que la página /finanzas/cfdi.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const direccion = sp.get("direccion") ?? "";
  const estado = sp.get("estado") ?? "";
  const empresaId = sp.get("empresa") ?? "";
  const desde = sp.get("desde") ?? "";
  const hasta = sp.get("hasta") ?? "";
  const formaPago = sp.get("formaPago") ?? "";
  const montoMin = sp.get("montoMin") ?? "";

  let query = supabase
    .from("cfdi")
    .select(
      `id, empresa_id, tipo, es_emitido, serie, folio, uuid_sat,
       fecha_emision, fecha_timbrado, rfc_emisor, nombre_emisor,
       rfc_receptor, nombre_receptor, uso_cfdi, metodo_pago, forma_pago,
       moneda, subtotal, descuento, iva_trasladado, iva_retenido, isr_retenido,
       total, monto_pagado, saldo_pendiente, estado,
       empresas(codigo, razon_social)`,
    )
    .order("fecha_emision", { ascending: false })
    .limit(20000);

  if (direccion === "emitidos") query = query.eq("es_emitido", true);
  if (direccion === "recibidos") query = query.eq("es_emitido", false);
  if (estado) query = query.eq("estado", estado as never);
  if (empresaId) query = query.eq("empresa_id", empresaId);
  if (desde) query = query.gte("fecha_emision", desde);
  if (hasta) {
    const finDia = new Date(hasta);
    finDia.setDate(finDia.getDate() + 1);
    query = query.lt("fecha_emision", finDia.toISOString().slice(0, 10));
  }
  if (formaPago) query = query.eq("metodo_pago", formaPago);
  if (montoMin) {
    const m = parseFloat(montoMin);
    if (!Number.isNaN(m)) query = query.gte("total", m);
  }
  if (q) {
    const qLower = q.replace(/['"]/g, "");
    query = query.or(
      `rfc_emisor.ilike.%${qLower}%,nombre_emisor.ilike.%${qLower}%,` +
        `rfc_receptor.ilike.%${qLower}%,nombre_receptor.ilike.%${qLower}%,` +
        `folio.ilike.%${qLower}%,serie.ilike.%${qLower}%,` +
        `uuid_sat::text.ilike.%${qLower}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headers = [
    "Empresa",
    "Empresa_RazonSocial",
    "Direccion",
    "Tipo",
    "Estado",
    "Serie",
    "Folio",
    "UUID",
    "Fecha_Emision",
    "Fecha_Timbrado",
    "RFC_Emisor",
    "Nombre_Emisor",
    "RFC_Receptor",
    "Nombre_Receptor",
    "Uso_CFDI",
    "Metodo_Pago",
    "Forma_Pago",
    "Moneda",
    "Subtotal",
    "Descuento",
    "IVA_Trasladado",
    "IVA_Retenido",
    "ISR_Retenido",
    "Total",
    "Monto_Pagado",
    "Saldo_Pendiente",
  ];

  const lines: string[] = [headers.join(",")];

  for (const c of data ?? []) {
    const emp = c.empresas as
      | { codigo: string; razon_social: string }
      | null;
    const fila = [
      emp?.codigo ?? "",
      emp?.razon_social ?? "",
      c.es_emitido ? "Emitido" : "Recibido",
      c.tipo,
      c.estado,
      c.serie ?? "",
      c.folio ?? "",
      c.uuid_sat ?? "",
      c.fecha_emision ?? "",
      c.fecha_timbrado ?? "",
      c.rfc_emisor,
      c.nombre_emisor ?? "",
      c.rfc_receptor,
      c.nombre_receptor ?? "",
      c.uso_cfdi ?? "",
      c.metodo_pago ?? "",
      c.forma_pago ?? "",
      c.moneda ?? "",
      Number(c.subtotal ?? 0).toFixed(2),
      Number(c.descuento ?? 0).toFixed(2),
      Number(c.iva_trasladado ?? 0).toFixed(2),
      Number(c.iva_retenido ?? 0).toFixed(2),
      Number(c.isr_retenido ?? 0).toFixed(2),
      Number(c.total ?? 0).toFixed(2),
      Number(c.monto_pagado ?? 0).toFixed(2),
      Number(c.saldo_pendiente ?? 0).toFixed(2),
    ];
    lines.push(fila.map(escape).join(","));
  }

  // BOM UTF-8 para Excel
  const csv = "﻿" + lines.join("\r\n");
  const fechaArchivo = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cfdi_export_${fechaArchivo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
