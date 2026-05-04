import { NextResponse, type NextRequest } from "next/server";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { fetchTiieRango, fetchTiieReciente } from "@/lib/banxico/tiie";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/tiie/sync — sincroniza la TIIE 28 desde Banxico.
 *
 * Body opcional:
 *   { desde?: string, hasta?: string } → sincroniza un rango.
 *   Sin body → sincroniza solo el dato más reciente.
 *
 * Permisos: CEO o tesorero corporativo.
 * Si se invoca con header `Authorization: Bearer <CRON_SECRET>` también acepta
 * (para cron jobs externos vía Vercel Cron / GitHub Actions / Supabase Edge).
 */
export async function POST(request: NextRequest) {
  // Auth: header de cron O usuario CEO/tesorero
  const cronHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const esCron = !!(cronSecret && cronHeader === `Bearer ${cronSecret}`);

  if (!esCron) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
    }
    const v = await obtenerVinculos();
    if (!esCEO(v) && !tieneAtributo(v, "tesorero_corporativo")) {
      return NextResponse.json(
        { error: "Sin permiso (requiere CEO o tesorero corporativo)." },
        { status: 403 },
      );
    }
  }

  let body: { desde?: string; hasta?: string } = {};
  try {
    body = (await request.json()) as { desde?: string; hasta?: string };
  } catch {
    body = {};
  }

  // Insertamos con admin para evitar RLS (la política permite tesorero, pero
  // el cron no tiene sesión).
  const admin = createAdminClient();

  if (body.desde && body.hasta) {
    const r = await fetchTiieRango(body.desde, body.hasta);
    if (!r.ok) {
      return NextResponse.json({ error: r.error }, { status: 502 });
    }
    if (r.datos.length === 0) {
      return NextResponse.json({ ok: true, insertados: 0, total: 0 });
    }
    const { error, count } = await admin
      .from("tiie_historico")
      .upsert(
        r.datos.map((d) => ({
          fecha: d.fecha,
          tipo: "tiie_28" as const,
          tasa: d.tasa,
          fuente: "banxico_sie",
        })),
        { onConflict: "fecha,tipo", count: "exact" },
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      insertados: count ?? r.datos.length,
      total: r.datos.length,
    });
  }

  // Solo el más reciente
  const r = await fetchTiieReciente();
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: 502 });
  }
  const { error } = await admin.from("tiie_historico").upsert(
    {
      fecha: r.dato.fecha,
      tipo: "tiie_28",
      tasa: r.dato.tasa,
      fuente: "banxico_sie",
    },
    { onConflict: "fecha,tipo" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Después de sincronizar, devengar intereses del día
  await admin.rpc("devengar_intereses_dia", {
    p_fecha: r.dato.fecha,
  });

  return NextResponse.json({
    ok: true,
    fecha: r.dato.fecha,
    tasa: r.dato.tasa,
  });
}
