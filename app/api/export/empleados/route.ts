import { NextResponse, type NextRequest } from "next/server";

import { esCEO, obtenerVinculos, tieneAtributo } from "@/lib/auth/permisos";
import { exportarExcel } from "@/lib/export/excel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });

  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    tieneAtributo(v, "rh") ||
    v.some((vi) => vi.rol === "director");
  if (!puede) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("empleados")
    .select(
      "nombre_completo, rfc, curp, puesto, categoria_personal, fecha_ingreso, salario_mensual_bruto, activo, empresas(codigo)",
    )
    .order("nombre_completo", { ascending: true })
    .limit(5000);

  const filas = ((data ?? []) as Array<Record<string, unknown>>).map((e) => ({
    nombre_completo: e.nombre_completo,
    rfc: e.rfc,
    curp: e.curp,
    empresa: (e.empresas as { codigo: string } | null)?.codigo ?? "",
    puesto: e.puesto,
    categoria: e.categoria_personal,
    fecha_ingreso: e.fecha_ingreso,
    salario_mensual: Number(e.salario_mensual_bruto ?? 0),
    activo: e.activo,
  }));

  const buf = await exportarExcel({
    nombre: `Empleados_${new Date().toISOString().slice(0, 10)}.xlsx`,
    hojas: [
      {
        nombre: "Empleados",
        columnas: [
          { header: "Nombre", key: "nombre_completo", width: 35 },
          { header: "RFC", key: "rfc", width: 15 },
          { header: "CURP", key: "curp", width: 20 },
          { header: "Empresa", key: "empresa", width: 12 },
          { header: "Puesto", key: "puesto", width: 25 },
          { header: "Categoría", key: "categoria", width: 14 },
          { header: "Ingreso", key: "fecha_ingreso", width: 12, format: "fecha" },
          {
            header: "Salario mensual",
            key: "salario_mensual",
            width: 16,
            format: "moneda",
          },
          { header: "Activo", key: "activo", width: 8 },
        ],
        datos: filas,
      },
    ],
  });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Empleados.xlsx"`,
    },
  });
}
