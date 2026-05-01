"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES = ["ceo", "director", "operativo", "empleado", "cliente"] as const;
const ATRIBUTOS_VALIDOS = [
  "aprobador_financiero",
  "coordinador_calidad",
  "tesorero_corporativo",
  "auditor_interno",
  "vendedor",
  "supervisor_cuadrilla",
] as const;

const InvitarSchema = z.object({
  email: z.string().email("Correo inválido"),
  rol: z.enum(ROLES),
  empresaIds: z.array(z.string().uuid()).min(1, "Selecciona al menos una empresa"),
  atributos: z.array(z.enum(ATRIBUTOS_VALIDOS)).default([]),
  puesto: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v ? v : null)),
});

export type InvitarState = {
  ok: boolean;
  error: string | null;
  message: string | null;
};

export async function invitarUsuario(
  _prev: InvitarState,
  formData: FormData,
): Promise<InvitarState> {
  // 1. Verificar que el caller es CEO.
  const vinculosCaller = await obtenerVinculos();
  if (!esCEO(vinculosCaller)) {
    return { ok: false, error: "Solo CEO puede invitar usuarios.", message: null };
  }

  // 2. Validar input.
  const parsed = InvitarSchema.safeParse({
    email: formData.get("email"),
    rol: formData.get("rol"),
    empresaIds: formData.getAll("empresaIds"),
    atributos: formData.getAll("atributos"),
    puesto: formData.get("puesto") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
      message: null,
    };
  }
  const { email, rol, empresaIds, atributos, puesto } = parsed.data;

  // 3. Crear/invitar usuario en auth.users.
  const admin = createAdminClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: invite, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/callback`,
    });

  // Si el usuario ya existe, intentamos solo asignar vínculos al usuario existente.
  let userId: string | null = invite?.user?.id ?? null;
  if (inviteErr) {
    const yaExiste =
      inviteErr.message.toLowerCase().includes("already") ||
      inviteErr.code === "email_exists" ||
      inviteErr.code === "user_already_exists";
    if (!yaExiste) {
      return {
        ok: false,
        error: `Error al invitar: ${inviteErr.message}`,
        message: null,
      };
    }
    // Buscar al usuario por email.
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (listErr) {
      return {
        ok: false,
        error: `No se pudo localizar al usuario existente: ${listErr.message}`,
        message: null,
      };
    }
    const existente = list.users.find((u) => u.email === email);
    if (!existente) {
      return {
        ok: false,
        error: "El correo ya existe pero no fue encontrado en la lista.",
        message: null,
      };
    }
    userId = existente.id;
  }

  if (!userId) {
    return {
      ok: false,
      error: "No se obtuvo el ID del usuario.",
      message: null,
    };
  }

  // 4. Insertar vínculos en usuarios_empresas (una fila por empresa seleccionada).
  const filas = empresaIds.map((empresa_id) => ({
    usuario_id: userId!,
    empresa_id,
    rol,
    atributos,
    puesto,
  }));

  const { error: insertErr } = await admin
    .from("usuarios_empresas")
    .upsert(filas, { onConflict: "usuario_id,empresa_id" });

  if (insertErr) {
    return {
      ok: false,
      error: `Error al asignar empresas: ${insertErr.message}`,
      message: null,
    };
  }

  revalidatePath("/configuracion/usuarios");
  return {
    ok: true,
    error: null,
    message: inviteErr
      ? `Usuario ${email} ya existía — vínculos asignados/actualizados.`
      : `Invitación enviada a ${email}. Asignados ${empresaIds.length} vínculo(s).`,
  };
}

const DesactivarSchema = z.object({
  usuarioId: z.string().uuid(),
});

export async function desactivarVinculos(
  _prev: { ok: boolean; error: string | null },
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const vinculosCaller = await obtenerVinculos();
  if (!esCEO(vinculosCaller)) {
    return { ok: false, error: "Solo CEO puede desactivar usuarios." };
  }

  const parsed = DesactivarSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "ID inválido." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("usuarios_empresas")
    .update({ activo: false, hasta: new Date().toISOString().slice(0, 10) })
    .eq("usuario_id", parsed.data.usuarioId);

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/configuracion/usuarios");
  return { ok: true, error: null };
}
