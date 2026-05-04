"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { LineaCreditoSchema } from "@/lib/prestamos/schemas";
import type { LineaCreditoState } from "@/lib/prestamos/state";
import { createClient } from "@/lib/supabase/server";

function gateLineas(
  vinculos: Awaited<ReturnType<typeof obtenerVinculos>>,
): boolean {
  return esCEO(vinculos) || tieneAtributo(vinculos, "tesorero_corporativo");
}

export async function crearLineaCredito(
  _prev: LineaCreditoState,
  formData: FormData,
): Promise<LineaCreditoState> {
  const v = await obtenerVinculos();
  if (!gateLineas(v)) {
    return {
      ok: false,
      error:
        "Solo el CEO o el tesorero corporativo pueden abrir líneas de crédito.",
    };
  }

  const parsed = LineaCreditoSchema.safeParse({
    empresa_acreedora_id: formData.get("empresa_acreedora_id"),
    empresa_deudora_id: formData.get("empresa_deudora_id"),
    monto_autorizado: formData.get("monto_autorizado"),
    vigencia_inicio: formData.get("vigencia_inicio"),
    vigencia_fin: formData.get("vigencia_fin"),
    tasa_base: formData.get("tasa_base") || "tiie_28",
    spread: formData.get("spread") ?? 0.06,
    capitaliza_intereses: formData.get("capitaliza_intereses") ?? undefined,
    dia_corte: formData.get("dia_corte") ?? 31,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const supabase = createClient();
  const { error } = await supabase.from("lineas_credito_inter_co").insert({
    empresa_acreedora_id: d.empresa_acreedora_id,
    empresa_deudora_id: d.empresa_deudora_id,
    monto_autorizado: d.monto_autorizado,
    vigencia_inicio: d.vigencia_inicio,
    vigencia_fin: d.vigencia_fin,
    tasa_base: d.tasa_base,
    spread: d.spread,
    capitaliza_intereses: d.capitaliza_intereses,
    dia_corte: d.dia_corte,
    observaciones: d.observaciones,
    activa: true,
  });
  if (error) {
    return {
      ok: false,
      error: error.message?.includes("duplicate")
        ? "Ya existe una línea con esa combinación acreedora-deudora-vigencia."
        : `Error: ${error.message}`,
    };
  }
  revalidatePath("/finanzas/tesoreria");
  revalidatePath("/finanzas/tesoreria/creditos");
  return { ok: true, error: null };
}

export async function toggleLineaActiva(
  lineaId: string,
  proxima: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const v = await obtenerVinculos();
  if (!gateLineas(v)) return { ok: false, error: "Sin permiso." };
  const supabase = createClient();
  const { error } = await supabase
    .from("lineas_credito_inter_co")
    .update({ activa: proxima })
    .eq("id", lineaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/finanzas/tesoreria/creditos");
  return { ok: true, error: null };
}
