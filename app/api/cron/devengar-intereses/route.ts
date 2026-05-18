import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Cron diario: devenga intereses de préstamos inter-co del día.
 *
 * Programado en `vercel.json` para correr cada noche a las 23:55 MX
 * (06:55 UTC del día siguiente — Sonora es UTC-7 todo el año sin DST).
 *
 * Llama al RPC Postgres `devengar_intereses_dia` que es idempotente:
 * si ya existe registro para (prestamo_id, fecha), no duplica.
 *
 * Autenticación: Vercel inyecta `Authorization: Bearer <CRON_SECRET>`
 * automáticamente cuando llama a un cron interno. Validamos ese header.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  // Si no hay CRON_SECRET configurado, aceptamos cualquier llamada del
  // header `x-vercel-cron: 1` (lo inyecta Vercel y solo Vercel puede).
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const hasSecret = expected && auth === `Bearer ${expected}`;

  if (!isVercelCron && !hasSecret) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const supabase = createAdminClient();
  const fecha = new Date().toISOString().slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "devengar_intereses_dia",
    { p_fecha: fecha },
  );

  if (error) {
    console.error("[cron devengo]", error);
    return NextResponse.json(
      { ok: false, error: error.message, fecha },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    fecha,
    prestamos_devengados: data ?? 0,
  });
}
