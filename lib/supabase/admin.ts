import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Cliente admin con `SUPABASE_SERVICE_ROLE_KEY` — bypassea RLS.
 *
 * **Reglas estrictas:**
 * - SOLO importar desde Server Actions y route handlers (server-only).
 * - NUNCA importar desde Client Components — la service_role expone toda la DB.
 * - Cuando se use, validar PERMISOS explícitamente con `lib/auth/permisos.ts`
 *   antes de operar (no hay RLS que te proteja).
 */
export function createAdminClient() {
  // .trim() defensivo: si Vercel guardó la env var con espacio/tab inicial
  // (típico de copy/paste desconfigurado), inviteUserByEmail y otras
  // operaciones que arman URLs absolutas se rompen con
  // "Failed to fetch" / "Invalid URL".
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
