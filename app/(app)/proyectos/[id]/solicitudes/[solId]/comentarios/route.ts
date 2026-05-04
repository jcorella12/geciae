import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * GET /proyectos/{id}/solicitudes/{solId}/comentarios
 *
 * Devuelve los comentarios de una solicitud con el nombre del autor
 * resuelto desde `empleados.nombre_completo` para evitar mostrar UUIDs.
 *
 * Auth: la RLS de `solicitud_comentarios` filtra automáticamente lo que
 * el usuario puede ver. Si no tiene acceso, regresa array vacío.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string; solId: string } },
) {
  const supabase = createClient();
  // Cast: tabla nueva (sprint 4.1) no en types regenerados.
  const { data: rows } = await (
    supabase as unknown as {
      from: (
        t: string,
      ) => {
        select: (cols: string) => {
          eq: (
            col: string,
            v: string,
          ) => {
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => Promise<{ data: Array<Record<string, unknown>> | null }>;
          };
        };
      };
    }
  )
    .from("solicitud_comentarios")
    .select("id, autor_id, texto, menciones, created_at")
    .eq("solicitud_id", params.solId)
    .order("created_at", { ascending: true });

  const comentariosRaw = rows ?? [];

  // Resolver nombres de autor desde empleados
  const autorIds = Array.from(
    new Set(
      comentariosRaw
        .map((c) => c.autor_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const nombresPorUserId: Record<string, string> = {};
  if (autorIds.length > 0) {
    const { data: emps } = await supabase
      .from("empleados")
      .select("usuario_id, nombre_completo")
      .in("usuario_id", autorIds);
    for (const e of emps ?? []) {
      if (e.usuario_id)
        nombresPorUserId[e.usuario_id] = e.nombre_completo as string;
    }
  }

  const comentarios = comentariosRaw.map((c) => ({
    id: c.id as string,
    autor_id: c.autor_id as string,
    autor_nombre: nombresPorUserId[c.autor_id as string] ?? null,
    texto: c.texto as string,
    created_at: c.created_at as string,
    menciones: (c.menciones as string[] | null) ?? [],
  }));

  return NextResponse.json({ comentarios });
}
