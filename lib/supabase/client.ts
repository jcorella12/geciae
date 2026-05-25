import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";

/**
 * Supabase client para Client Components.
 */
export function createClient() {
  // .trim() defensivo contra whitespace al inicio/final de las env vars
  // (Vercel a veces guarda con tab/espacio si se pegó desde otra fuente).
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
  );
}
