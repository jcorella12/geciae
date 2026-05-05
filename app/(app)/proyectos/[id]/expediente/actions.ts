"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  obtenerVinculos,
  puedeGestionarProyectosEn,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

const ActualizarDocSchema = z.object({
  expediente_id: z.string().uuid(),
  estado: z.enum(["pendiente", "en_revision", "aprobado", "no_aplica"]),
  url_archivo: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_recibido: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  observaciones: z.string().trim().max(1000).optional().nullable(),
});

export async function actualizarDocExpediente(
  _prev: { ok: boolean; error: string | null },
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const parsed = ActualizarDocSchema.safeParse({
    expediente_id: formData.get("expediente_id"),
    estado: formData.get("estado"),
    url_archivo: formData.get("url_archivo") ?? "",
    fecha_recibido: formData.get("fecha_recibido") ?? "",
    observaciones: formData.get("observaciones") ?? null,
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const supabase = createClient();
  const { data: row } = await supabase
    .from("proyecto_expediente")
    .select("proyecto_id, proyectos!inner(empresa_id)")
    .eq("id", parsed.data.expediente_id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Documento no encontrado." };

  const empresaId = (
    row.proyectos as unknown as { empresa_id: string } | null
  )?.empresa_id;
  if (!empresaId) return { ok: false, error: "Proyecto sin empresa." };

  const v = await obtenerVinculos();
  if (!puedeGestionarProyectosEn(v, empresaId))
    return { ok: false, error: "Sin permiso." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const patch: Record<string, unknown> = {
    estado: parsed.data.estado,
    url_archivo: parsed.data.url_archivo,
    fecha_recibido: parsed.data.fecha_recibido,
    observaciones: parsed.data.observaciones,
  };
  if (parsed.data.estado === "aprobado") {
    patch.fecha_aprobacion = new Date().toISOString().slice(0, 10);
    patch.responsable_id = user.id;
  }

  const { error } = await supabase
    .from("proyecto_expediente")
    .update(patch as never)
    .eq("id", parsed.data.expediente_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/proyectos/${row.proyecto_id}/expediente`);
  return { ok: true, error: null };
}
