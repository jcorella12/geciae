import { NextResponse, type NextRequest } from "next/server";

import { exportarExcel } from "@/lib/export/excel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/proyectos
 * Exporta lista de proyectos visibles al usuario en xlsx.
 */
export async function GET(_request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });

  const { data } = await supabase
    .from("proyectos")
    .select(
      "codigo, nombre, tipo, estado, fecha_inicio_planeado, fecha_fin_planeado, monto_contratado, monto_facturado, presupuesto_costo, costo_real, semaforo, empresas!proyectos_empresa_id_fkey(codigo)",
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  const filas = (data ?? []).map((p) => ({
    codigo: p.codigo,
    nombre: p.nombre,
    tipo: p.tipo,
    estado: p.estado,
    empresa: (p as { empresas?: { codigo: string } }).empresas?.codigo ?? "",
    fecha_inicio: p.fecha_inicio_planeado,
    fecha_fin: p.fecha_fin_planeado,
    monto_contratado: Number(p.monto_contratado ?? 0),
    monto_facturado: Number(p.monto_facturado ?? 0),
    presupuesto_costo: Number(p.presupuesto_costo ?? 0),
    costo_real: Number(p.costo_real ?? 0),
    semaforo: p.semaforo,
  }));

  const buf = await exportarExcel({
    nombre: `Proyectos_${new Date().toISOString().slice(0, 10)}.xlsx`,
    hojas: [
      {
        nombre: "Proyectos",
        columnas: [
          { header: "Código", key: "codigo", width: 15 },
          { header: "Nombre", key: "nombre", width: 40 },
          { header: "Tipo", key: "tipo", width: 15 },
          { header: "Estado", key: "estado", width: 15 },
          { header: "Empresa", key: "empresa", width: 12 },
          { header: "Inicio", key: "fecha_inicio", width: 12, format: "fecha" },
          { header: "Fin", key: "fecha_fin", width: 12, format: "fecha" },
          { header: "Contratado", key: "monto_contratado", width: 15, format: "moneda" },
          { header: "Facturado", key: "monto_facturado", width: 15, format: "moneda" },
          { header: "Presupuesto costo", key: "presupuesto_costo", width: 16, format: "moneda" },
          { header: "Costo real", key: "costo_real", width: 15, format: "moneda" },
          { header: "Semáforo", key: "semaforo", width: 12 },
        ],
        datos: filas,
      },
    ],
  });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Proyectos.xlsx"`,
    },
  });
}
