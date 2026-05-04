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
  const semaforo = sp.get("semaforo") ?? "";
  const activo = sp.get("activo") ?? "";
  const repse = sp.get("repse") ?? "";
  const aprobado = sp.get("aprobado") ?? "";

  let query = supabase
    .from("proveedores")
    .select(
      "razon_social, nombre_comercial, rfc, regimen_fiscal, cp_fiscal, tipo_proveedor, clasificacion_interna, requiere_repse, semaforo, esta_aprobado, fecha_aprobacion, observaciones, activo, created_at",
    )
    .order("razon_social", { ascending: true })
    .limit(20000);

  if (activo === "true") query = query.eq("activo", true);
  if (activo === "false") query = query.eq("activo", false);
  if (tipo) query = query.eq("tipo_proveedor", tipo);
  if (semaforo) query = query.eq("semaforo", semaforo);
  if (repse === "true") query = query.eq("requiere_repse", true);
  if (repse === "false") query = query.eq("requiere_repse", false);
  if (aprobado === "true") query = query.eq("esta_aprobado", true);
  if (aprobado === "false") query = query.eq("esta_aprobado", false);
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
    "RFC",
    "Razon_Social",
    "Nombre_Comercial",
    "Regimen_Fiscal",
    "CP_Fiscal",
    "Tipo",
    "Clasificacion",
    "Requiere_REPSE",
    "Semaforo",
    "Aprobado",
    "Fecha_Aprobacion",
    "Activo",
    "Fecha_Alta",
    "Observaciones",
  ];

  const lines: string[] = [headers.join(",")];
  for (const p of data ?? []) {
    lines.push(
      [
        p.rfc,
        p.razon_social,
        p.nombre_comercial ?? "",
        p.regimen_fiscal ?? "",
        p.cp_fiscal ?? "",
        p.tipo_proveedor ?? "",
        p.clasificacion_interna ?? "",
        p.requiere_repse ? "Sí" : "No",
        p.semaforo ?? "",
        p.esta_aprobado ? "Sí" : "No",
        p.fecha_aprobacion ?? "",
        p.activo ? "Activo" : "Inactivo",
        p.created_at ?? "",
        p.observaciones ?? "",
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
      "Content-Disposition": `attachment; filename="proveedores_${fechaArchivo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
