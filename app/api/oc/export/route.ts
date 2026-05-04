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
  const estado = sp.get("estado") ?? "";
  const empresaId = sp.get("empresa") ?? "";
  const desde = sp.get("desde") ?? "";
  const hasta = sp.get("hasta") ?? "";
  const montoMin = sp.get("montoMin") ?? "";

  let query = supabase
    .from("ordenes_compra")
    .select(
      "numero, fecha_emision, fecha_entrega_esperada, fecha_entrega_real, fecha_pago, subtotal, iva, retenciones, total, estado, condiciones_pago, comentarios, empresas(codigo, razon_social), proveedores(razon_social, rfc, semaforo), proyectos(codigo, nombre)",
    )
    .order("fecha_emision", { ascending: false })
    .limit(20000);

  if (estado) query = query.eq("estado", estado as never);
  if (empresaId) query = query.eq("empresa_id", empresaId);
  if (desde) query = query.gte("fecha_emision", desde);
  if (hasta) {
    const finDia = new Date(hasta);
    finDia.setDate(finDia.getDate() + 1);
    query = query.lt("fecha_emision", finDia.toISOString().slice(0, 10));
  }
  if (montoMin) {
    const m = parseFloat(montoMin);
    if (!Number.isNaN(m)) query = query.gte("total", m);
  }
  if (q) {
    query = query.or(`numero.ilike.%${q}%,comentarios.ilike.%${q}%`);
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
    "Numero",
    "Empresa",
    "Empresa_RazonSocial",
    "Proveedor",
    "RFC_Proveedor",
    "Semaforo",
    "Proyecto",
    "Proyecto_Nombre",
    "Fecha_Emision",
    "Fecha_Entrega_Esperada",
    "Fecha_Entrega_Real",
    "Fecha_Pago",
    "Subtotal",
    "IVA",
    "Retenciones",
    "Total",
    "Estado",
    "Condiciones_Pago",
    "Comentarios",
  ];

  const lines: string[] = [headers.join(",")];
  for (const oc of data ?? []) {
    const emp = oc.empresas as
      | { codigo: string; razon_social: string }
      | null;
    const prov = oc.proveedores as
      | { razon_social: string; rfc: string; semaforo: string | null }
      | null;
    const proy = oc.proyectos as
      | { codigo: string; nombre: string }
      | null;
    lines.push(
      [
        oc.numero,
        emp?.codigo ?? "",
        emp?.razon_social ?? "",
        prov?.razon_social ?? "",
        prov?.rfc ?? "",
        prov?.semaforo ?? "",
        proy?.codigo ?? "",
        proy?.nombre ?? "",
        oc.fecha_emision ?? "",
        oc.fecha_entrega_esperada ?? "",
        oc.fecha_entrega_real ?? "",
        oc.fecha_pago ?? "",
        Number(oc.subtotal ?? 0).toFixed(2),
        Number(oc.iva ?? 0).toFixed(2),
        Number(oc.retenciones ?? 0).toFixed(2),
        Number(oc.total ?? 0).toFixed(2),
        oc.estado ?? "",
        oc.condiciones_pago ?? "",
        oc.comentarios ?? "",
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
      "Content-Disposition": `attachment; filename="oc_${fechaArchivo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
