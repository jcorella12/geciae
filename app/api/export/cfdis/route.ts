import { NextResponse, type NextRequest } from "next/server";

import { exportarExcel } from "@/lib/export/excel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  const direccion = sp.get("direccion") ?? "";

  let query = supabase
    .from("cfdi")
    .select(
      "tipo, es_emitido, serie, folio, uuid_sat, fecha_emision, rfc_emisor, nombre_emisor, rfc_receptor, nombre_receptor, total, monto_pagado, saldo_pendiente, estado, metodo_pago, forma_pago",
    )
    .order("fecha_emision", { ascending: false })
    .limit(20000);
  if (desde) query = query.gte("fecha_emision", desde);
  if (hasta) query = query.lte("fecha_emision", hasta);
  if (direccion === "emitidos") query = query.eq("es_emitido", true);
  if (direccion === "recibidos") query = query.eq("es_emitido", false);

  const { data } = await query;

  const buf = await exportarExcel({
    nombre: `CFDIs_${new Date().toISOString().slice(0, 10)}.xlsx`,
    hojas: [
      {
        nombre: "CFDIs",
        columnas: [
          { header: "Tipo", key: "tipo", width: 10 },
          { header: "Dirección", key: "direccion", width: 11 },
          { header: "Serie", key: "serie", width: 8 },
          { header: "Folio", key: "folio", width: 10 },
          { header: "UUID SAT", key: "uuid_sat", width: 38 },
          { header: "Fecha", key: "fecha_emision", width: 12, format: "fecha" },
          { header: "RFC emisor", key: "rfc_emisor", width: 14 },
          { header: "Emisor", key: "nombre_emisor", width: 30 },
          { header: "RFC receptor", key: "rfc_receptor", width: 14 },
          { header: "Receptor", key: "nombre_receptor", width: 30 },
          { header: "Total", key: "total", width: 14, format: "moneda" },
          { header: "Pagado", key: "monto_pagado", width: 14, format: "moneda" },
          { header: "Saldo", key: "saldo_pendiente", width: 14, format: "moneda" },
          { header: "Estado", key: "estado", width: 12 },
          { header: "M. pago", key: "metodo_pago", width: 8 },
          { header: "F. pago", key: "forma_pago", width: 8 },
        ],
        datos: ((data ?? []) as Array<Record<string, unknown>>).map((c) => ({
          ...c,
          direccion: c.es_emitido ? "Emitido" : "Recibido",
        })),
      },
    ],
  });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="CFDIs.xlsx"`,
    },
  });
}
