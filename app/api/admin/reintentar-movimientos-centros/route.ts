import { NextResponse } from "next/server";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { reintentarMovimientosOCFallidos } from "@/lib/centros/registrar";

export const dynamic = "force-dynamic";

/**
 * Endpoint admin para reintentar masivamente movimientos de centros de
 * costo en OCs que fallaron (Patch 4 del Sprint 1).
 *
 * Acceso: CEO o contralor.
 */
export async function POST() {
  const v = await obtenerVinculos();
  if (!esCEO(v) && !tieneAtributo(v, "contralor")) {
    return NextResponse.json(
      { ok: false, error: "Sin permiso (requiere CEO o contralor)." },
      { status: 403 },
    );
  }

  const r = await reintentarMovimientosOCFallidos();
  return NextResponse.json({ ok: true, ...r });
}
