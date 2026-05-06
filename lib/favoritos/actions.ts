"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function agregarFavorito(
  entidadTipo: string,
  entidadId: string,
  etiqueta?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { error } = await supabase
    .from("favoritos_usuario" as never)
    .upsert(
      {
        usuario_id: user.id,
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        etiqueta: etiqueta ?? null,
      } as never,
      { onConflict: "usuario_id,entidad_tipo,entidad_id" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/mi-dia");
  return { ok: true, error: null };
}

export async function quitarFavorito(
  entidadTipo: string,
  entidadId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { error } = await supabase
    .from("favoritos_usuario" as never)
    .delete()
    .eq("usuario_id", user.id)
    .eq("entidad_tipo", entidadTipo)
    .eq("entidad_id", entidadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/mi-dia");
  return { ok: true, error: null };
}

export async function listarFavoritos(): Promise<
  Array<{ entidad_tipo: string; entidad_id: string; etiqueta: string | null }>
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = (await supabase
    .from("favoritos_usuario" as never)
    .select("entidad_tipo, entidad_id, etiqueta")
    .eq("usuario_id", user.id)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: false })) as unknown as {
    data: Array<{ entidad_tipo: string; entidad_id: string; etiqueta: string | null }> | null;
  };
  return data ?? [];
}
