import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";

/**
 * Supabase client para Server Components, Route Handlers y Server Actions.
 * Usa cookies de Next para mantener la sesión.
 */
export function createClient() {
  const cookieStore = cookies();

  // .trim() defensivo — Vercel a veces guarda whitespace al inicio cuando
  // el valor se pega desde un copy/paste y eso rompe inviteUserByEmail y
  // otras llamadas que arman URLs absolutas.
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Components no permiten setear cookies; el middleware lo hace.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // ignore en RSC
          }
        },
      },
    },
  );
}
