"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createAdminClient } from "@/lib/supabase/admin";

const UmbralSchema = z.object({
  usuarioId: z.string().uuid(),
  empresaId: z.string().uuid(),
  umbralOc: z
    .preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().min(0).nullable(),
    )
    .optional(),
  umbralOt: z
    .preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().min(0).nullable(),
    )
    .optional(),
  umbralPrestamo: z
    .preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().min(0).nullable(),
    )
    .optional(),
});

export type UmbralResult = {
  ok: boolean;
  error: string | null;
};

/**
 * Actualiza solo los umbrales financieros de un vínculo, preservando
 * rol/atributos/puesto. Solo CEO puede modificar.
 */
export async function actualizarUmbralesVinculo(input: {
  usuarioId: string;
  empresaId: string;
  umbralOc: number | null;
  umbralOt: number | null;
  umbralPrestamo: number | null;
}): Promise<UmbralResult> {
  const vinculos = await obtenerVinculos();
  if (!esCEO(vinculos)) {
    return {
      ok: false,
      error: "Solo CEO puede modificar umbrales de aprobación.",
    };
  }

  const parsed = UmbralSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const admin = createAdminClient();

  // Cargar configuración actual para mergear sin pisar otros atributos.
  const { data: actual, error: loadErr } = await admin
    .from("usuarios_empresas")
    .select("configuracion_atributos, atributos")
    .eq("usuario_id", parsed.data.usuarioId)
    .eq("empresa_id", parsed.data.empresaId)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message };
  if (!actual) return { ok: false, error: "Vínculo no encontrado." };

  if (!(actual.atributos ?? []).includes("aprobador_financiero")) {
    return {
      ok: false,
      error:
        "Este usuario no tiene el atributo 'aprobador_financiero' en esta empresa. Asígnaselo primero desde la ficha del usuario.",
    };
  }

  const cfgActual =
    (actual.configuracion_atributos as Record<string, unknown>) ?? {};
  const cfgMerged = {
    ...cfgActual,
    aprobador_financiero: {
      umbral_max_mxn_oc: parsed.data.umbralOc ?? null,
      umbral_max_mxn_ot: parsed.data.umbralOt ?? null,
      umbral_max_mxn_prestamo: parsed.data.umbralPrestamo ?? null,
    },
  };

  const { error: updErr } = await admin
    .from("usuarios_empresas")
    .update({
      configuracion_atributos: cfgMerged as never,
    })
    .eq("usuario_id", parsed.data.usuarioId)
    .eq("empresa_id", parsed.data.empresaId);

  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath("/configuracion/umbrales");
  revalidatePath(
    `/configuracion/usuarios/${parsed.data.usuarioId}/edit`,
  );
  return { ok: true, error: null };
}
