import { NextResponse, type NextRequest } from "next/server";

import { exportarExcel } from "@/lib/export/excel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });

  const { data } = await supabase
    .from("clientes")
    .select(
      "razon_social, nombre_comercial, rfc, regimen_fiscal, cp_fiscal, email_facturacion, tipo, segmento, riesgo, score_pago, activo, estado",
    )
    .order("razon_social", { ascending: true })
    .limit(5000);

  const buf = await exportarExcel({
    nombre: `Clientes_${new Date().toISOString().slice(0, 10)}.xlsx`,
    hojas: [
      {
        nombre: "Clientes",
        columnas: [
          { header: "Razón social", key: "razon_social", width: 35 },
          { header: "Nombre comercial", key: "nombre_comercial", width: 25 },
          { header: "RFC", key: "rfc", width: 15 },
          { header: "Régimen fiscal", key: "regimen_fiscal", width: 12 },
          { header: "CP", key: "cp_fiscal", width: 8 },
          { header: "Email facturación", key: "email_facturacion", width: 30 },
          { header: "Tipo", key: "tipo", width: 14 },
          { header: "Segmento", key: "segmento", width: 14 },
          { header: "Riesgo", key: "riesgo", width: 10 },
          { header: "Score pago", key: "score_pago", width: 11 },
          { header: "Estado", key: "estado", width: 11 },
          { header: "Activo", key: "activo", width: 8 },
        ],
        datos: data ?? [],
      },
    ],
  });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Clientes.xlsx"`,
    },
  });
}
