"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { EMPRESA_COOKIE, VISTA_CONSOLIDADA } from "@/lib/empresa-activa";

/**
 * Cambia la "empresa activa" en sesión. Acepta un UUID de empresa o el valor
 * especial `VISTA_CONSOLIDADA`. La cookie es leída por `app/(app)/layout.tsx`
 * para resolver el contexto de queries.
 */
export async function switchEmpresa(value: string) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  if (value !== VISTA_CONSOLIDADA && !isUuid) {
    throw new Error("Valor inválido para empresa activa");
  }

  cookies().set(EMPRESA_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  // Invalidar todo el layout (app) para que se relean queries con el contexto nuevo.
  revalidatePath("/", "layout");
}
