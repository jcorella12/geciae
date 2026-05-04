import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/notificaciones — devuelve el listado del usuario actual.
 * Query params:
 *  - solo_no_leidas=true → filtra solo no leídas (default: todas top 20)
 */
export async function GET(request: NextRequest) {
  const soloNoLeidas =
    request.nextUrl.searchParams.get("solo_no_leidas") === "true";

  const supabase = createClient();

  let q = supabase
    .from("notificaciones")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(30);
  if (soloNoLeidas) q = q.eq("leida", false);

  const { data: lista, count, error } = await q;

  // Count específico de no leídas
  const { count: noLeidas } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("leida", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    notificaciones: lista ?? [],
    total: count ?? 0,
    no_leidas: noLeidas ?? 0,
  });
}

/**
 * PATCH /api/notificaciones — marca como leídas.
 * Body:
 *   { ids?: string[] }    → marca esas
 *   { todas: true }       → marca todas las del usuario
 */
export async function PATCH(request: NextRequest) {
  let body: { ids?: string[]; todas?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createClient();
  const ahora = new Date().toISOString();

  if (body.todas) {
    const { error } = await supabase
      .from("notificaciones")
      .update({ leida: true, fecha_lectura: ahora })
      .eq("leida", false);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const { error } = await supabase
      .from("notificaciones")
      .update({ leida: true, fecha_lectura: ahora })
      .in("id", body.ids);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Falta `ids` o `todas`" }, { status: 400 });
}
