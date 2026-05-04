"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Server action ligera para registrar un evento de uso.
 *
 * Privacy-first: el caller pasa solo `pagina` (path normalizado, sin
 * query params) y `detalle` opcional limitado a metadatos no sensibles.
 *
 * RLS garantiza que el usuario_id sea el propio. Si el insert falla
 * (red, RLS, lo que sea), no propagamos el error — la telemetría no
 * debe romper el flujo principal del usuario.
 */
export async function registrarEventoUso(input: {
  tipo: "pageview" | "action" | "error_user";
  pagina?: string | null;
  detalle?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  if (!usr.user) return; // Best-effort sin sesión

  // Tablas nuevas (sprint 5.3) no en types regenerados — cast localizado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  // Truncar página y detalle por seguridad
  const paginaLimpia = (input.pagina ?? "")
    .replace(/\?.*$/, "") // sin query params
    .slice(0, 200);

  // Excluir cualquier valor sensible que el caller haya colado
  const detalleSafe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input.detalle ?? {})) {
    // Solo strings/numbers/booleans cortos
    if (typeof v === "string" && v.length <= 200) detalleSafe[k] = v;
    else if (typeof v === "number" || typeof v === "boolean")
      detalleSafe[k] = v;
  }

  await sb.from("eventos_uso").insert({
    usuario_id: usr.user.id,
    tipo: input.tipo,
    pagina: paginaLimpia || null,
    detalle: detalleSafe,
  });
}
