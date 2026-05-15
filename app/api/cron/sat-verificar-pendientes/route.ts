/**
 * Vercel Cron — verifica descargas SAT pendientes y auto-procesa las que
 * el SAT ya tiene listas. Corre cada N horas según `vercel.json`.
 *
 * Vercel marca las peticiones cron con header `x-vercel-cron: 1`. Además
 * exige `Authorization: Bearer <CRON_SECRET>` automáticamente cuando hay
 * `CRON_SECRET` en env vars (defensa contra invocaciones manuales desde
 * la red pública).
 *
 * Como esta ruta corre sin sesión de usuario, marcamos el contexto con
 * `cronContext.run` para que las server actions de SAT detecten que
 * vienen del cron, salten el chequeo de cookies y usen el cliente
 * admin (service-role) en las queries.
 */
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { verificarPendientesEnBloque } from "@/app/(app)/configuracion/sat/descarga-actions";
import { cronContext } from "@/lib/sat/cron-context";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel hobby permite hasta 60s; pro 300s.

export async function GET() {
  // 1. Validar que viene de Vercel Cron o con el secreto correcto.
  const h = headers();
  const isVercelCron = h.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET;
  const authHeader = h.get("authorization");
  const hasSecret =
    secret && authHeader === `Bearer ${secret}` ? true : false;

  if (!isVercelCron && !hasSecret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // 2. Correr la verificación dentro del contexto de cron.
  const inicio = Date.now();
  try {
    const r = await cronContext.run({ isCron: true }, async () => {
      return await verificarPendientesEnBloque();
    });

    const durMs = Date.now() - inicio;
    return NextResponse.json({
      ok: r.ok,
      durMs,
      total: r.resumen.length,
      procesadas: r.resumen.filter((x) => x.procesado).length,
      listas: r.resumen.filter((x) => x.listo && !x.procesado).length,
      errores: r.resumen.filter((x) => x.error).length,
      resumen: r.resumen.map((x) => ({
        id: x.descarga_id,
        empresa: x.empresa_codigo,
        tipo: x.tipo,
        estado_final: x.estado_final ?? x.estado_anterior,
        importados: x.procesado?.importados ?? 0,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error desconocido",
        durMs: Date.now() - inicio,
      },
      { status: 500 },
    );
  }
}
