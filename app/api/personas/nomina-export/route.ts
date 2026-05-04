import { NextResponse, type NextRequest } from "next/server";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/personas/nomina-export?empresa=<uuid>&periodo=YYYY-MM
 *
 * CSV plano con columnas compatibles con CONTPAQi Nóminas y Aspel NOI.
 * El contador externo lo importa como base — el ERP no calcula recibos.
 *
 * Permisos: CEO, atributo aprobador_financiero, o director de la empresa.
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
  const empresaId = request.nextUrl.searchParams.get("empresa");
  if (!empresaId) {
    return NextResponse.json(
      { error: "Falta parámetro empresa." },
      { status: 400 },
    );
  }
  const tieneAcceso =
    esCEO(v) ||
    tieneAtributo(v, "aprobador_financiero") ||
    v.some(
      (vi) =>
        vi.empresa_id === empresaId &&
        ["director", "ceo"].includes(vi.rol),
    );
  if (!tieneAcceso) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const periodo = request.nextUrl.searchParams.get("periodo") ?? "";
  // periodo: "YYYY-MM" — opcional, para limitar viáticos al mes
  const [year, month] =
    periodo && /^\d{4}-\d{2}$/.test(periodo)
      ? periodo.split("-").map(Number)
      : [
          new Date().getFullYear(),
          new Date().getMonth() + 1,
        ];
  const inicioPeriodo = new Date(year, month - 1, 1);
  const finPeriodo = new Date(year, month, 1);

  const { data: empleados } = await supabase
    .from("empleados")
    .select(
      "id, numero_empleado, nombre_completo, rfc, curp, nss, categoria, puesto, area, fecha_ingreso, salario_base, cuenta_bancaria, prestaciones",
    )
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .order("numero_empleado");

  if (!empleados || empleados.length === 0) {
    return NextResponse.json(
      { error: "Sin empleados activos en esta empresa." },
      { status: 404 },
    );
  }

  // Viáticos aprobados/reembolsados del período por empleado
  const empIds = empleados.map((e) => e.id);
  const { data: viaticos } = await supabase
    .from("viaticos")
    .select("empleado_id, monto, estado")
    .in("empleado_id", empIds)
    .in("estado", ["aprobado", "reembolsado"])
    .gte("fecha_gasto", inicioPeriodo.toISOString().slice(0, 10))
    .lt("fecha_gasto", finPeriodo.toISOString().slice(0, 10));

  const viaticosPorEmp = new Map<string, number>();
  for (const v of viaticos ?? []) {
    viaticosPorEmp.set(
      v.empleado_id,
      (viaticosPorEmp.get(v.empleado_id) ?? 0) + Number(v.monto ?? 0),
    );
  }

  // CSV header (compatible con plantilla genérica CONTPAQi/Aspel)
  const cols = [
    "NumeroEmpleado",
    "NombreCompleto",
    "RFC",
    "CURP",
    "NSS",
    "Categoria",
    "Puesto",
    "Area",
    "FechaIngreso",
    "Antiguedad_Anos",
    "SalarioBase",
    "ClaveBanco",
    "CLABE",
    "Viaticos_Periodo",
    "Periodo",
  ];

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lineas: string[] = [cols.join(",")];
  for (const e of empleados) {
    const cuenta = e.cuenta_bancaria as
      | { clabe?: string; banco?: string }
      | null;
    const ingresoMs = new Date(e.fecha_ingreso).getTime();
    const ahora = Date.now();
    const anios = (ahora - ingresoMs) / (1000 * 60 * 60 * 24 * 365.25);
    const fila = [
      e.numero_empleado,
      e.nombre_completo,
      e.rfc ?? "",
      e.curp,
      e.nss ?? "",
      e.categoria,
      e.puesto,
      e.area ?? "",
      e.fecha_ingreso,
      anios.toFixed(2),
      e.salario_base != null ? Number(e.salario_base).toFixed(2) : "",
      cuenta?.banco ?? "",
      cuenta?.clabe ?? "",
      (viaticosPorEmp.get(e.id) ?? 0).toFixed(2),
      `${year}-${String(month).padStart(2, "0")}`,
    ];
    lineas.push(fila.map(escape).join(","));
  }

  // Agregar BOM para Excel
  const csv = "﻿" + lineas.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nomina-${year}-${String(month).padStart(2, "0")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
