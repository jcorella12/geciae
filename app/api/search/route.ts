import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=texto
 *
 * Busca en los 3 catálogos (clientes, proveedores, empleados) en paralelo,
 * limitado a 5 resultados por categoría. Respeta RLS — el cliente Supabase
 * autenticado solo regresa lo que el usuario tiene permiso de ver.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ clientes: [], proveedores: [], empleados: [] });
  }

  const supabase = createClient();
  const like = `%${q}%`;

  const [clientesRes, proveedoresRes, empleadosRes] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, razon_social, nombre_comercial, rfc, tipo")
      .or(
        `razon_social.ilike.${like},nombre_comercial.ilike.${like},rfc.ilike.${like}`,
      )
      .eq("activo", true)
      .limit(5),
    supabase
      .from("proveedores")
      .select("id, razon_social, nombre_comercial, rfc, semaforo")
      .or(
        `razon_social.ilike.${like},nombre_comercial.ilike.${like},rfc.ilike.${like}`,
      )
      .eq("activo", true)
      .limit(5),
    supabase
      .from("empleados")
      .select(
        "id, nombre_completo, curp, numero_empleado, puesto, empresas(codigo)",
      )
      .or(
        `nombre_completo.ilike.${like},curp.ilike.${like},numero_empleado.ilike.${like},puesto.ilike.${like}`,
      )
      .eq("activo", true)
      .limit(5),
  ]);

  return NextResponse.json({
    clientes: clientesRes.data ?? [],
    proveedores: proveedoresRes.data ?? [],
    empleados: empleadosRes.data ?? [],
  });
}
