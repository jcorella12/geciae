"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES = ["ceo", "director", "operativo", "empleado", "cliente"] as const;
const ATRIBUTOS = [
  "aprobador_financiero",
  "coordinador_calidad",
  "tesorero_corporativo",
  "auditor_interno",
  "vendedor",
  "supervisor_cuadrilla",
  "rh",
  "contralor",
] as const;

const ActualizarSchema = z.object({
  usuarioId: z.string().uuid(),
  empresaId: z.string().uuid(),
  rol: z.enum(ROLES),
  atributos: z.array(z.enum(ATRIBUTOS)).default([]),
  puesto: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v ? v : null)),
  // Umbrales (en MXN). null = sin límite.
  umbralOc: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === "" ? null : Number(v),
    )
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), {
      message: "Umbral OC inválido",
    }),
  umbralOt: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === "" ? null : Number(v),
    )
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), {
      message: "Umbral OT inválido",
    }),
  umbralPrestamo: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === "" ? null : Number(v),
    )
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), {
      message: "Umbral Préstamo inválido",
    }),
});

export type ActualizarState = {
  ok: boolean;
  error: string | null;
  message: string | null;
};

async function gateCEO(): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  if (!esCEO(v)) {
    return { ok: false, error: "Solo CEO puede editar usuarios." };
  }
  return { ok: true };
}

export async function actualizarVinculo(
  _prev: ActualizarState,
  formData: FormData,
): Promise<ActualizarState> {
  const gate = await gateCEO();
  if (!gate.ok) return { ok: false, error: gate.error, message: null };

  const parsed = ActualizarSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
    empresaId: formData.get("empresaId"),
    rol: formData.get("rol"),
    atributos: formData.getAll("atributos"),
    puesto: formData.get("puesto") || undefined,
    umbralOc: formData.get("umbralOc") || undefined,
    umbralOt: formData.get("umbralOt") || undefined,
    umbralPrestamo: formData.get("umbralPrestamo") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
      message: null,
    };
  }
  const d = parsed.data;

  // Construir configuracion_atributos: solo incluir aprobador_financiero si tiene el atributo.
  const configuracion_atributos: Record<string, unknown> = {};
  if (d.atributos.includes("aprobador_financiero")) {
    configuracion_atributos.aprobador_financiero = {
      umbral_max_mxn_oc: d.umbralOc,
      umbral_max_mxn_ot: d.umbralOt,
      umbral_max_mxn_prestamo: d.umbralPrestamo,
    };
  }
  if (d.atributos.includes("tesorero_corporativo")) {
    configuracion_atributos.tesorero_corporativo = { alcance: "grupo" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("usuarios_empresas")
    .update({
      rol: d.rol,
      atributos: d.atributos,
      // Cast: el tipo `Json` generado es estricto y no acepta Record genérico.
      // El payload es JSONB válido por construcción.
      configuracion_atributos: configuracion_atributos as never,
      puesto: d.puesto,
    })
    .eq("usuario_id", d.usuarioId)
    .eq("empresa_id", d.empresaId);

  if (error) {
    return { ok: false, error: error.message, message: null };
  }

  revalidatePath(`/configuracion/usuarios/${d.usuarioId}/edit`);
  revalidatePath("/configuracion/usuarios");
  return { ok: true, error: null, message: "Cambios guardados." };
}

const DesactivarSchema = z.object({
  usuarioId: z.string().uuid(),
  empresaId: z.string().uuid(),
});

export async function desactivarVinculo(
  _prev: ActualizarState,
  formData: FormData,
): Promise<ActualizarState> {
  const gate = await gateCEO();
  if (!gate.ok) return { ok: false, error: gate.error, message: null };

  const parsed = DesactivarSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
    empresaId: formData.get("empresaId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "IDs inválidos.", message: null };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("usuarios_empresas")
    .update({
      activo: false,
      hasta: new Date().toISOString().slice(0, 10),
    })
    .eq("usuario_id", parsed.data.usuarioId)
    .eq("empresa_id", parsed.data.empresaId);

  if (error) {
    return { ok: false, error: error.message, message: null };
  }

  revalidatePath(`/configuracion/usuarios/${parsed.data.usuarioId}/edit`);
  revalidatePath("/configuracion/usuarios");
  return {
    ok: true,
    error: null,
    message: "Vínculo desactivado (preservamos histórico, no se eliminó).",
  };
}

const AgregarSchema = z.object({
  usuarioId: z.string().uuid(),
  empresaId: z.string().uuid(),
  rol: z.enum(ROLES),
});

export async function agregarVinculo(
  _prev: ActualizarState,
  formData: FormData,
): Promise<ActualizarState> {
  const gate = await gateCEO();
  if (!gate.ok) return { ok: false, error: gate.error, message: null };

  const parsed = AgregarSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
    empresaId: formData.get("empresaId"),
    rol: formData.get("rol"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Selecciona empresa y rol.",
      message: null,
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("usuarios_empresas").upsert(
    {
      usuario_id: parsed.data.usuarioId,
      empresa_id: parsed.data.empresaId,
      rol: parsed.data.rol,
      atributos: [],
      activo: true,
      hasta: null,
      desde: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "usuario_id,empresa_id" },
  );

  if (error) {
    return { ok: false, error: error.message, message: null };
  }

  revalidatePath(`/configuracion/usuarios/${parsed.data.usuarioId}/edit`);
  revalidatePath("/configuracion/usuarios");
  return {
    ok: true,
    error: null,
    message: "Vínculo agregado. Edita atributos y umbrales abajo si aplica.",
  };
}
