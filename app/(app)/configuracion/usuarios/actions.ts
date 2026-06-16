"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  esCEO,
  obtenerVinculos,
  puedeRestablecerContrasenas,
} from "@/lib/auth/permisos";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES = ["ceo", "director", "operativo", "empleado", "cliente"] as const;
const ATRIBUTOS_VALIDOS = [
  "aprobador_financiero",
  "tesorero_corporativo",
  "auditor_interno",
  "vendedor",
  "supervisor_cuadrilla",
  "rh",
  "contralor",
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
  // Logging detallado para Vercel logs — útil cuando el form muestra
  // "Application error" sin pista. Filtrar "[invitar]" en Vercel logs.
  const log = (msg: string, extra?: Record<string, unknown>) => {
    // eslint-disable-next-line no-console
    console.log(`[invitar] ${msg}`, extra ?? "");
  };

  // Wrap todo en try/catch: cualquier throw inesperado se convierte en
  // un error visible en el form en vez de "Application error" genérico.
  try {
    const emailDebug = formData.get("email");
    log("inicio", {
      email: emailDebug,
      rol: formData.get("rol"),
      empresasCount: formData.getAll("empresaIds").length,
      atributosCount: formData.getAll("atributos").length,
    });

    // 1. Verificar que el caller es CEO.
    const vinculosCaller = await obtenerVinculos();
    if (!esCEO(vinculosCaller)) {
      log("denied — caller no es CEO");
      return {
        ok: false,
        error: "Solo CEO puede invitar usuarios.",
        message: null,
      };
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
      log("zod failed", {
        issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
      return {
        ok: false,
        error: parsed.error.issues.map((i) => i.message).join("; "),
        message: null,
      };
    }
    const { email, rol, empresaIds, atributos, puesto } = parsed.data;
    log("zod ok");

    // 3. Crear/invitar usuario en auth.users.
    const admin = createAdminClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "http://localhost:3000";
    log("calling inviteUserByEmail", { siteUrl, redirectTo: `${siteUrl}/auth/callback` });

    const { data: invite, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/auth/callback`,
      });

    if (inviteErr) {
      log("inviteErr", {
        message: inviteErr.message,
        code: inviteErr.code,
        status: inviteErr.status,
      });
    }

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
          error: `Error al invitar: ${inviteErr.message}${inviteErr.code ? ` (code: ${inviteErr.code})` : ""}`,
          message: null,
        };
      }
      log("usuario ya existe, buscando por email");
      // Buscar al usuario por email.
      const { data: list, error: listErr } = await admin.auth.admin.listUsers(
        { perPage: 1000 },
      );
      if (listErr) {
        log("listUsers fail", { error: listErr.message });
        return {
          ok: false,
          error: `No se pudo localizar al usuario existente: ${listErr.message}`,
          message: null,
        };
      }
      const existente = list.users.find((u) => u.email === email);
      if (!existente) {
        log("usuario no encontrado en list", { totalUsers: list.users.length });
        return {
          ok: false,
          error: "El correo ya existe pero no fue encontrado en la lista.",
          message: null,
        };
      }
      userId = existente.id;
      log("usuario existente encontrado", { userId });
    } else {
      log("invitación enviada", { userId });
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

    log("upserting vínculos", { count: filas.length });

    const { error: insertErr } = await admin
      .from("usuarios_empresas")
      .upsert(filas, { onConflict: "usuario_id,empresa_id" });

    if (insertErr) {
      log("upsert fail", {
        message: insertErr.message,
        code: insertErr.code,
        details: insertErr.details,
        hint: insertErr.hint,
      });
      return {
        ok: false,
        error: `Error al asignar empresas: ${insertErr.message}${insertErr.code ? ` (code: ${insertErr.code})` : ""}${insertErr.hint ? ` — ${insertErr.hint}` : ""}`,
        message: null,
      };
    }

    log("OK — invitación completa");
    revalidatePath("/configuracion/usuarios");
    return {
      ok: true,
      error: null,
      message: inviteErr
        ? `Usuario ${email} ya existía — vínculos asignados/actualizados.`
        : `Invitación enviada a ${email}. Asignados ${empresaIds.length} vínculo(s).`,
    };
  } catch (e) {
    // Cualquier excepción no manejada cae aquí y NO genera "Application error"
    // — se muestra como toast rojo en el form con el mensaje real.
    const err = e as Error;
    log("EXCEPTION", {
      message: err.message,
      name: err.name,
      stack: err.stack?.split("\n").slice(0, 3),
    });
    return {
      ok: false,
      error: `Excepción inesperada: ${err.message}`,
      message: null,
    };
  }
}

const RestablecerSchema = z.object({
  usuarioId: z.string().uuid(),
  nuevaContrasena: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export type RestablecerResult = {
  ok: boolean;
  error: string | null;
  mensaje: string | null;
  email?: string | null;
};

/**
 * Restablece la contraseña de cualquier usuario.
 * Permitido para CEO o contralor — para soporte cuando alguien pierde acceso.
 *
 * Devuelve también el email del usuario (para confirmar al admin a quién le
 * cambió la contraseña) pero NUNCA expone la contraseña actualizada en logs
 * ni en el resultado.
 */
export async function restablecerContrasenaUsuario(
  usuarioId: string,
  nuevaContrasena: string,
): Promise<RestablecerResult> {
  // 1. Verificar permiso del caller.
  const vinculosCaller = await obtenerVinculos();
  if (!puedeRestablecerContrasenas(vinculosCaller)) {
    return {
      ok: false,
      error: "Solo CEO o contralor pueden restablecer contraseñas.",
      mensaje: null,
    };
  }

  // 2. Validar input.
  const parsed = RestablecerSchema.safeParse({ usuarioId, nuevaContrasena });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
      mensaje: null,
    };
  }

  // 3. Actualizar contraseña via admin API.
  const admin = createAdminClient();

  // Cargar email para confirmación visual.
  const { data: userResp, error: userErr } =
    await admin.auth.admin.getUserById(parsed.data.usuarioId);
  if (userErr || !userResp.user) {
    return {
      ok: false,
      error: "Usuario no encontrado.",
      mensaje: null,
    };
  }

  const { error: updErr } = await admin.auth.admin.updateUserById(
    parsed.data.usuarioId,
    { password: parsed.data.nuevaContrasena },
  );
  if (updErr) {
    return {
      ok: false,
      error: `No se pudo actualizar: ${updErr.message}`,
      mensaje: null,
    };
  }

  revalidatePath("/configuracion/usuarios");
  return {
    ok: true,
    error: null,
    email: userResp.user.email ?? null,
    mensaje: `Contraseña actualizada para ${userResp.user.email}. Comunícasela al usuario por un canal seguro.`,
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
