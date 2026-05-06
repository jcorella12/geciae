"use server";

import { revalidatePath } from "next/cache";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  layoutDefaultPorRol,
  type WidgetLayout,
} from "@/lib/widgets/catalogo";

export async function obtenerPreferenciasUsuario(
  pagina: "mi-dia" | "dashboard",
): Promise<{ layout: WidgetLayout; isDefault: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { layout: [], isDefault: true };

  const { data } = (await supabase
    .from("widget_preferencias_usuario" as never)
    .select("layout" as never)
    .eq("usuario_id", user.id)
    .eq("pagina", pagina)
    .maybeSingle()) as unknown as {
    data: { layout: WidgetLayout } | null;
  };

  if (data?.layout && Array.isArray(data.layout) && data.layout.length > 0) {
    return { layout: data.layout, isDefault: false };
  }

  // Default por rol
  const v = await obtenerVinculos();
  const roles = v.map((vi) => vi.rol);
  const atributos = v.flatMap((vi) => vi.atributos ?? []);
  return { layout: layoutDefaultPorRol(pagina, roles, atributos), isDefault: true };
}

export async function guardarLayout(
  pagina: "mi-dia" | "dashboard",
  layout: WidgetLayout,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { error } = await supabase
    .from("widget_preferencias_usuario" as never)
    .upsert(
      {
        usuario_id: user.id,
        pagina,
        layout,
      } as never,
      { onConflict: "usuario_id,pagina" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${pagina}`);
  return { ok: true, error: null };
}

export async function restablecerRecomendado(
  pagina: "mi-dia" | "dashboard",
): Promise<{ ok: boolean; error: string | null }> {
  const v = await obtenerVinculos();
  const roles = v.map((vi) => vi.rol);
  const atributos = v.flatMap((vi) => vi.atributos ?? []);
  const layout = layoutDefaultPorRol(pagina, roles, atributos);
  return guardarLayout(pagina, layout);
}
