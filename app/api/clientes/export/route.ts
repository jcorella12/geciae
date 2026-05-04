import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  const tipo = sp.get("tipo") ?? "";
  const riesgo = sp.get("riesgo") ?? "";
  const activo = sp.get("activo") ?? "";
  const scoreMinRaw = sp.get("score_min") ?? "";
  const scoreMin = scoreMinRaw ? parseInt(scoreMinRaw, 10) : NaN;

  let query = supabase
    .from("clientes")
    .select(
      "razon_social, nombre_comercial, rfc, regimen_fiscal, cp_fiscal, tipo, segmento, riesgo, score_pago, score_satisfaccion, email_facturacion, uso_cfdi_default, observaciones, activo, created_at",
    )
    .order("razon_social", { ascending: true })
    .limit(20000);

  if (activo === "true") query = query.eq("activo", true);
  if (activo === "false") query = query.eq("activo", false);
  if (tipo) query = query.eq("tipo", tipo);
  if (riesgo) query = query.eq("riesgo", riesgo);
  if (!Number.isNaN(scoreMin) && scoreMin > 0) {
    query = query.gte("score_pago", scoreMin);
  }
  if (q) {
    query = query.or(
      `razon_social.ilike.%${q}%,nombre_comercial.ilike.%${q}%,rfc.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headers = [
    "Razon_Social",
    "Nombre_Comercial",
    "RFC",
    "Regimen_Fiscal",
    "CP_Fiscal",
    "Tipo",
    "Segmento",
    "Riesgo",
    "Score_Pago",
    "Score_Satisfaccion",
    "Email_Facturacion",
    "Uso_CFDI_Default",
    "Activo",
    "Fecha_Alta",
    "Observaciones",
  ];

  const lines: string[] = [headers.join(",")];
  for (const c of data ?? []) {
    lines.push(
      [
        c.razon_social,
        c.nombre_comercial ?? "",
        c.rfc,
        c.regimen_fiscal ?? "",
        c.cp_fiscal ?? "",
        c.tipo ?? "",
        c.segmento ?? "",
        c.riesgo ?? "",
        c.score_pago ?? "",
        c.score_satisfaccion ?? "",
        c.email_facturacion ?? "",
        c.uso_cfdi_default ?? "",
        c.activo ? "Activo" : "Inactivo",
        c.created_at ?? "",
        c.observaciones ?? "",
      ]
        .map(escape)
        .join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const fechaArchivo = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes_${fechaArchivo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
