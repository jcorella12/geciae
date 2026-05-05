"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES = ["empleado", "operativo", "director"] as const;
const ATRIBUTOS_VALIDOS = [
  "aprobador_financiero",
  "coordinador_calidad",
  "tesorero_corporativo",
  "auditor_interno",
  "vendedor",
  "supervisor_cuadrilla",
  "rh",
  "contralor",
] as const;

const Schema = z.object({
  empleado_id: z.string().uuid(),
  email: z.string().email("Correo inválido"),
  rol: z.enum(ROLES).default("empleado"),
  atributos: z.array(z.enum(ATRIBUTOS_VALIDOS)).default([]),
});

export type GenerarUsuarioState = {
  ok: boolean;
  error: string | null;
  message: string | null;
};

export const initialGenerarUsuarioState: GenerarUsuarioState = {
  ok: false,
  error: null,
  message: null,
};

/**
 * Genera (o vincula) una cuenta de usuario para un empleado existente.
 * - Si el email no tiene cuenta auth: la crea via inviteUserByEmail (magic link)
 * - Si ya tiene cuenta: la reutiliza y solo crea/actualiza el vínculo
 *   en usuarios_empresas + actualiza empleados.usuario_id
 *
 * Permisos: CEO, RH, contralor, o director de la empresa del empleado.
 */
export async function generarUsuarioParaEmpleado(
  _prev: GenerarUsuarioState,
  formData: FormData,
): Promise<GenerarUsuarioState> {
  const parsed = Schema.safeParse({
    empleado_id: formData.get("empleado_id"),
    email: formData.get("email"),
    rol: formData.get("rol") || "empleado",
    atributos: formData.getAll("atributos"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
      message: null,
    };
  }
  const { empleado_id, email, rol, atributos } = parsed.data;

  const admin = createAdminClient();

  // 1. Cargar empleado
  const { data: empleado, error: empErr } = await admin
    .from("empleados")
    .select("id, empresa_id, nombre_completo, email_personal, usuario_id, puesto")
    .eq("id", empleado_id)
    .maybeSingle();
  if (empErr || !empleado) {
    return {
      ok: false,
      error: "Empleado no encontrado.",
      message: null,
    };
  }

  // 2. Verificar permiso
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    tieneAtributo(v, "rh") ||
    tieneAtributo(v, "contralor") ||
    v.some((vi) => vi.rol === "director" && vi.empresa_id === empleado.empresa_id);
  if (!puede) {
    return {
      ok: false,
      error:
        "Sin permiso (requiere CEO, RH, contralor, o director de la empresa del empleado).",
      message: null,
    };
  }

  // 3. Si el empleado ya tiene usuario_id, devolver mensaje informativo
  if (empleado.usuario_id) {
    return {
      ok: false,
      error: "Este empleado ya tiene un usuario vinculado.",
      message: null,
    };
  }

  // 4. Crear o reutilizar usuario auth
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let userId: string | null = null;
  const { data: invite, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/callback`,
      data: {
        empleado_id,
        nombre_completo: empleado.nombre_completo,
      },
    });

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
    // Buscar usuario existente por email
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (listErr) {
      return {
        ok: false,
        error: `No se pudo localizar usuario existente: ${listErr.message}`,
        message: null,
      };
    }
    const existente = list.users.find((u) => u.email === email);
    if (!existente) {
      return {
        ok: false,
        error: "Correo existe pero no se encontró el usuario.",
        message: null,
      };
    }
    userId = existente.id;
  } else {
    userId = invite?.user?.id ?? null;
  }

  if (!userId) {
    return {
      ok: false,
      error: "No se obtuvo ID del usuario.",
      message: null,
    };
  }

  // 5. Verificar que ese usuario_id no esté ya en otro empleado
  const { data: otroEmpleado } = await admin
    .from("empleados")
    .select("id, nombre_completo")
    .eq("usuario_id", userId)
    .maybeSingle();
  if (otroEmpleado && otroEmpleado.id !== empleado_id) {
    return {
      ok: false,
      error: `Este correo ya está vinculado al empleado ${otroEmpleado.nombre_completo}. Cada cuenta solo puede pertenecer a un empleado.`,
      message: null,
    };
  }

  // 6. Insertar vínculo en usuarios_empresas (rol "empleado" típicamente)
  const { error: vincErr } = await admin
    .from("usuarios_empresas")
    .upsert(
      {
        usuario_id: userId,
        empresa_id: empleado.empresa_id,
        rol,
        atributos,
        puesto: empleado.puesto,
      },
      { onConflict: "usuario_id,empresa_id" },
    );
  if (vincErr) {
    return {
      ok: false,
      error: `Error al vincular empresa: ${vincErr.message}`,
      message: null,
    };
  }

  // 7. Actualizar empleado.usuario_id + email_personal si vacío
  const patch: Record<string, unknown> = { usuario_id: userId };
  if (!empleado.email_personal) {
    patch.email_personal = email;
  }
  const { error: updErr } = await admin
    .from("empleados")
    .update(patch as never)
    .eq("id", empleado_id);
  if (updErr) {
    return {
      ok: false,
      error: `Error al actualizar empleado: ${updErr.message}`,
      message: null,
    };
  }

  revalidatePath(`/personas/${empleado_id}`);
  revalidatePath("/personas");

  return {
    ok: true,
    error: null,
    message: inviteErr
      ? `Cuenta existente vinculada a ${empleado.nombre_completo}. El usuario ya puede iniciar sesión y entrar a su portal.`
      : `Invitación enviada a ${email}. El empleado recibirá un correo con magic link para activar su acceso.`,
  };
}
