"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function actualizarPreferenciaNotif(
  tipo: string,
  recibir: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("notificaciones_preferencias")
    .upsert(
      {
        usuario_id: user.id,
        tipo,
        recibir,
      },
      { onConflict: "usuario_id,tipo" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/perfil/notificaciones");
  return { ok: true, error: null };
}

export async function marcarTodasLeidas(
  categoria?: string,
): Promise<{ ok: boolean; count: number; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, count: 0, error: "Sin sesión." };

  // El parámetro `categoria` se reserva para uso futuro: los tipos_notificacion
  // definen la categoría en lib/notificaciones/catalogo.ts y por ahora se
  // marcan TODAS las no leídas del usuario.
  void categoria;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = (supabase as any)
    .from("notificaciones")
    .update({ leida: true, leida_at: new Date().toISOString() })
    .eq("usuario_id", user.id)
    .eq("leida", false);

  const { error } = await q;
  if (error) return { ok: false, count: 0, error: error.message };
  revalidatePath("/notificaciones");
  return { ok: true, count: 0, error: null };
}
