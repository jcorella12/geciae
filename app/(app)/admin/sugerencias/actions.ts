"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORIAS,
  ESTADOS,
  initialCrearSugerenciaState,
  initialUpdateSugerenciaState,
  type CrearSugerenciaState,
  type UpdateSugerenciaState,
} from "@/lib/sugerencias/state";

// Helper local: la tabla es nueva (sprint 5.1) y los types no están regenerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clientSug(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as unknown as any;
}

const CrearSchema = z.object({
  categoria: z.enum(CATEGORIAS as [string, ...string[]]),
  descripcion: z
    .string()
    .trim()
    .min(10, "La descripción es muy corta (mínimo 10 caracteres)")
    .max(4000),
  url_contexto: z.string().trim().max(500).optional().nullable(),
  user_agent: z.string().trim().max(500).optional().nullable(),
  empresa_contexto: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null))
    .nullable(),
});

/**
 * Crea una nueva sugerencia. Cualquier usuario autenticado puede crear.
 * RLS garantiza que el usuario_id sea el propio.
 */
export async function crearSugerencia(
  _prev: CrearSugerenciaState,
  formData: FormData,
): Promise<CrearSugerenciaState> {
  const parsed = CrearSchema.safeParse({
    categoria: formData.get("categoria"),
    descripcion: formData.get("descripcion"),
    url_contexto: formData.get("url_contexto") || null,
    user_agent: formData.get("user_agent") || null,
    empresa_contexto: formData.get("empresa_contexto") ?? "",
  });
  if (!parsed.success)
    return {
      ...initialCrearSugerenciaState,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  if (!usr.user)
    return { ...initialCrearSugerenciaState, error: "Sesión expirada." };

  const { error } = await clientSug().from("sugerencias_mejora").insert({
    usuario_id: usr.user.id,
    empresa_contexto: parsed.data.empresa_contexto,
    categoria: parsed.data.categoria,
    descripcion: parsed.data.descripcion,
    url_contexto: parsed.data.url_contexto,
    user_agent: parsed.data.user_agent,
  });
  if (error)
    return { ...initialCrearSugerenciaState, error: error.message };

  revalidatePath("/admin/sugerencias");
  return { ok: true, error: null };
}

const UpdateSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(ESTADOS as [string, ...string[]]).optional(),
  prioridad: z.coerce.number().int().min(0).max(100).optional(),
  notas_internas: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null))
    .nullable(),
  asignado_a: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null))
    .nullable(),
});

/**
 * Solo CEO puede actualizar el triage de una sugerencia (estado, prioridad,
 * notas internas, asignado). RLS lo bloquea pero validamos también aquí.
 */
export async function actualizarSugerencia(
  _prev: UpdateSugerenciaState,
  formData: FormData,
): Promise<UpdateSugerenciaState> {
  const v = await obtenerVinculos();
  if (!esCEO(v))
    return {
      ...initialUpdateSugerenciaState,
      error: "Solo CEO puede actualizar sugerencias.",
    };

  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    estado: formData.get("estado") || undefined,
    prioridad: formData.get("prioridad") ?? undefined,
    notas_internas: formData.get("notas_internas") ?? "",
    asignado_a: formData.get("asignado_a") ?? "",
  });
  if (!parsed.success)
    return { ...initialUpdateSugerenciaState, error: "Datos inválidos." };

  const patch: Record<string, unknown> = {};
  if (parsed.data.estado !== undefined) patch.estado = parsed.data.estado;
  if (parsed.data.prioridad !== undefined)
    patch.prioridad = parsed.data.prioridad;
  if (parsed.data.notas_internas !== undefined)
    patch.notas_internas = parsed.data.notas_internas;
  if (parsed.data.asignado_a !== undefined)
    patch.asignado_a = parsed.data.asignado_a;
  if (Object.keys(patch).length === 0)
    return { ok: true, error: null };

  const { error } = await clientSug()
    .from("sugerencias_mejora")
    .update(patch)
    .eq("id", parsed.data.id);
  if (error)
    return { ...initialUpdateSugerenciaState, error: error.message };

  revalidatePath("/admin/sugerencias");
  revalidatePath(`/admin/sugerencias/${parsed.data.id}`);
  return { ok: true, error: null };
}
